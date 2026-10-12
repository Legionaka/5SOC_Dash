'use server';

import { auth } from '@/auth';
import { revalidatePath } from 'next/cache';
import postgres from 'postgres';
import { z } from 'zod';

const sql = postgres(process.env.POSTGRES_URL!, { ssl: 'require' });
const clinicianRoles = ['admin', 'doctor'] as const;

async function clinician() {
  const session = await auth();
  if (!session?.user.email || !session.user.role || !clinicianRoles.includes(session.user.role as typeof clinicianRoles[number])) return null;
  return { email: session.user.email, name: session.user.name ?? 'Doctor', role: session.user.role };
}

async function audit(actor: { email: string; role: string }, action: string, entityType: string, entityId: string | null, metadata: Record<string, unknown> = {}) {
  try {
    await sql`
      INSERT INTO audit_logs (actor_email, actor_role, action, entity_type, entity_id, metadata)
      VALUES (${actor.email}, ${actor.role}, ${action}, ${entityType}, ${entityId}, ${sql.json(metadata as any)})
    `;
  } catch (error) {
    console.error('Clinical audit entry failed:', error);
  }
}

function refreshClinicalViews(patientEmail?: string) {
  revalidatePath('/dashboard/doctor');
  revalidatePath('/dashboard/doctor/queue');
  revalidatePath('/dashboard/doctor/results');
  revalidatePath('/dashboard/doctor/notes');
  revalidatePath('/dashboard/doctor/availability');
  revalidatePath('/dashboard/doctor/patients');
  if (patientEmail) {
    revalidatePath(`/dashboard/doctor/patients/${encodeURIComponent(patientEmail)}`);
    revalidatePath('/dashboard/user');
    revalidatePath('/dashboard/user/records');
  }
}

export async function updateAppointmentCheckIn(appointmentId: string, checkInStatus: string) {
  const session = await auth();
  const actor = session?.user.email && ['admin', 'doctor', 'nurse', 'pharmacy_reception'].includes(session.user.role ?? '')
    ? { email: session.user.email, role: session.user.role ?? 'staff' }
    : null;
  const id = z.string().uuid().safeParse(appointmentId);
  const status = z.enum(['Not checked in', 'Checked in', 'In consultation', 'Complete']).safeParse(checkInStatus);
  if (!actor || !id.success || !status.success) return { success: false, message: 'Unable to update appointment check-in.' };
  if (['nurse', 'pharmacy_reception'].includes(actor.role) && !['Not checked in', 'Checked in'].includes(status.data)) return { success: false, message: 'Your role can update check-in status only.' };
  try {
    const [appointment] = await sql`
      UPDATE appointments
      SET check_in_status = ${status.data},
          checked_in_at = CASE WHEN ${status.data} = 'Checked in' THEN NOW() ELSE checked_in_at END,
          status = CASE WHEN ${status.data} = 'Complete' THEN 'Completed' ELSE status END
      WHERE id = ${id.data} AND status NOT IN ('Cancelled', 'Rejected', 'Completed')
      RETURNING patient_email
    `;
    if (!appointment) return { success: false, message: 'Appointment is no longer active.' };
    await audit(actor, 'appointment.check_in_updated', 'appointment', id.data, { checkInStatus: status.data });
    refreshClinicalViews(appointment.patient_email);
    return { success: true, message: 'Appointment check-in updated.' };
  } catch (error) {
    console.error('Appointment check-in update failed:', error);
    return { success: false, message: 'We could not update check-in.' };
  }
}

const NoteSchema = z.object({
  appointmentId: z.string().uuid(),
  title: z.string().trim().min(2).max(160),
  content: z.string().trim().min(5).max(12000),
  addendumTo: z.string().uuid().optional(),
});

export async function createClinicalNote(input: z.infer<typeof NoteSchema>) {
  const actor = await clinician();
  const parsed = NoteSchema.safeParse(input);
  if (!actor || !parsed.success) return { success: false, message: 'Complete the note details before saving.' };
  try {
    const [appointment] = await sql`
      SELECT id, patient_email FROM appointments WHERE id = ${parsed.data.appointmentId} LIMIT 1
    `;
    if (!appointment) return { success: false, message: 'Appointment not found.' };
    if (parsed.data.addendumTo) {
      const [parent] = await sql`
        SELECT id FROM clinical_notes WHERE id = ${parsed.data.addendumTo}
          AND patient_email = ${appointment.patient_email} AND status = 'Signed' LIMIT 1
      `;
      if (!parent) return { success: false, message: 'Addenda must refer to a signed note for this patient.' };
    }
    const [note] = await sql`
      INSERT INTO clinical_notes (patient_email, appointment_id, doctor_email, title, content, status, addendum_to)
      VALUES (${appointment.patient_email}, ${appointment.id}, ${actor.email}, ${parsed.data.title}, ${parsed.data.content}, ${parsed.data.addendumTo ? 'Addendum' : 'Draft'}, ${parsed.data.addendumTo ?? null})
      RETURNING id
    `;
    await audit(actor, 'clinical_note.created', 'clinical_note', note.id, { patientEmail: appointment.patient_email, addendum: Boolean(parsed.data.addendumTo) });
    refreshClinicalViews(appointment.patient_email);
    return { success: true, message: parsed.data.addendumTo ? 'Addendum saved.' : 'Draft note saved.' };
  } catch (error) {
    console.error('Clinical note creation failed:', error);
    return { success: false, message: 'We could not save the clinical note.' };
  }
}

export async function signClinicalNote(noteId: string) {
  const actor = await clinician();
  const id = z.string().uuid().safeParse(noteId);
  if (!actor || !id.success) return { success: false, message: 'Unable to sign this note.' };
  try {
    const [note] = await sql`
      UPDATE clinical_notes SET status = 'Signed', signed_at = NOW(), updated_at = NOW()
      WHERE id = ${id.data} AND status IN ('Draft', 'Addendum')
        AND (${actor.role} = 'admin' OR doctor_email = ${actor.email})
      RETURNING patient_email
    `;
    if (!note) return { success: false, message: 'Only your unsigned drafts can be signed.' };
    await audit(actor, 'clinical_note.signed', 'clinical_note', id.data);
    refreshClinicalViews(note.patient_email);
    return { success: true, message: 'Note signed and locked. Further changes must be added as an addendum.' };
  } catch (error) {
    console.error('Clinical note signing failed:', error);
    return { success: false, message: 'We could not sign the clinical note.' };
  }
}

const ResultSchema = z.object({
  appointmentId: z.string().uuid().optional(),
  patientEmail: z.string().email(),
  testName: z.string().trim().min(2).max(160),
  summary: z.string().trim().min(2).max(12000),
  priority: z.enum(['routine', 'critical']),
});

export async function createDiagnosticResult(input: z.infer<typeof ResultSchema>) {
  const actor = await clinician();
  const parsed = ResultSchema.safeParse(input);
  if (!actor || !parsed.success) return { success: false, message: 'Enter a patient, test name, and result summary.' };
  try {
    const [patient] = await sql`SELECT email FROM users WHERE email = ${parsed.data.patientEmail} AND role = 'patient' LIMIT 1`;
    if (!patient) return { success: false, message: 'Patient account not found.' };
    if (parsed.data.appointmentId) {
      const [visit] = await sql`SELECT id FROM appointments WHERE id = ${parsed.data.appointmentId} AND patient_email = ${patient.email} LIMIT 1`;
      if (!visit) return { success: false, message: 'The selected appointment does not belong to this patient.' };
    }
    const [result] = await sql`
      INSERT INTO diagnostic_results (patient_email, appointment_id, doctor_email, test_name, result_summary, priority)
      VALUES (${patient.email}, ${parsed.data.appointmentId ?? null}, ${actor.email}, ${parsed.data.testName}, ${parsed.data.summary}, ${parsed.data.priority})
      RETURNING id
    `;
    await audit(actor, 'diagnostic_result.created', 'diagnostic_result', result.id, { patientEmail: patient.email, priority: parsed.data.priority });
    refreshClinicalViews(patient.email);
    return { success: true, message: 'Result saved and marked pending review.' };
  } catch (error) {
    console.error('Diagnostic result creation failed:', error);
    return { success: false, message: 'We could not save the diagnostic result.' };
  }
}

export async function reviewDiagnosticResult(resultId: string, releaseToPatient: boolean) {
  const actor = await clinician();
  const id = z.string().uuid().safeParse(resultId);
  if (!actor || !id.success || typeof releaseToPatient !== 'boolean') return { success: false, message: 'Unable to update this result.' };
  try {
    const patientEmail = await sql.begin(async (tx) => {
      const [result] = await tx`
        UPDATE diagnostic_results
        SET status = 'Reviewed', reviewed_at = COALESCE(reviewed_at, NOW()),
            released_at = CASE WHEN ${releaseToPatient} THEN COALESCE(released_at, NOW()) ELSE released_at END
        WHERE id = ${id.data}
          AND (${actor.role} = 'admin' OR doctor_email = ${actor.email} OR doctor_email = 'lab-integration')
        RETURNING patient_email, test_name, result_summary
      `;
      if (!result) return null;
      if (releaseToPatient) {
        await tx`
          INSERT INTO medical_records (patient_email, record_type, title, summary, status)
          SELECT ${result.patient_email}, 'Diagnostic result', ${result.test_name}, ${result.result_summary}, 'Available'
          WHERE NOT EXISTS (
            SELECT 1 FROM medical_records WHERE patient_email = ${result.patient_email}
              AND record_type = 'Diagnostic result' AND title = ${result.test_name} AND summary = ${result.result_summary}
          )
        `;
        await tx`
          INSERT INTO notifications (user_email, user_type, type, message)
          VALUES (${result.patient_email}, 'patient', 'result_released', 'A diagnostic result has been released to your medical records.')
        `;
      }
      return result.patient_email as string;
    });
    if (!patientEmail) return { success: false, message: 'Result not found or not assigned to you.' };
    await audit(actor, 'diagnostic_result.reviewed', 'diagnostic_result', id.data, { releasedToPatient: releaseToPatient });
    refreshClinicalViews(patientEmail);
    return { success: true, message: releaseToPatient ? 'Result reviewed and released to the patient.' : 'Result marked reviewed.' };
  } catch (error) {
    console.error('Diagnostic result review failed:', error);
    return { success: false, message: 'We could not update the result.' };
  }
}

const ClinicalItemSchema = z.object({
  patientEmail: z.string().email(),
  type: z.enum(['allergy', 'condition', 'medication']),
  name: z.string().trim().min(2).max(160),
  details: z.string().trim().max(2000).optional(),
});

export async function addPatientClinicalItem(input: z.infer<typeof ClinicalItemSchema>) {
  const actor = await clinician();
  const parsed = ClinicalItemSchema.safeParse(input);
  if (!actor || !parsed.success) return { success: false, message: 'Enter the patient and clinical item details.' };
  try {
    const [patient] = await sql`SELECT email FROM users WHERE email = ${parsed.data.patientEmail} AND role = 'patient' LIMIT 1`;
    if (!patient) return { success: false, message: 'Patient account not found.' };
    const [item] = await sql`
      INSERT INTO patient_clinical_items (patient_email, item_type, item_name, details, created_by)
      VALUES (${patient.email}, ${parsed.data.type}, ${parsed.data.name}, ${parsed.data.details ?? ''}, ${actor.email})
      RETURNING id
    `;
    await audit(actor, `patient_${parsed.data.type}.added`, 'patient_clinical_item', item.id, { patientEmail: patient.email });
    refreshClinicalViews(patient.email);
    return { success: true, message: 'Clinical item added to the patient chart.' };
  } catch (error) {
    console.error('Clinical item creation failed:', error);
    return { success: false, message: 'We could not add this item.' };
  }
}

export async function resolvePatientClinicalItem(itemId: string) {
  const actor = await clinician();
  const id = z.string().uuid().safeParse(itemId);
  if (!actor || !id.success) return { success: false, message: 'Unable to update chart item.' };
  try {
    const [item] = await sql`
      UPDATE patient_clinical_items SET status = 'Resolved', archived_at = NOW()
      WHERE id = ${id.data} AND status = 'Active'
      RETURNING patient_email, item_type
    `;
    if (!item) return { success: false, message: 'Active chart item not found.' };
    await audit(actor, `patient_${item.item_type}_resolved`, 'patient_clinical_item', id.data, { patientEmail: item.patient_email });
    refreshClinicalViews(item.patient_email);
    return { success: true, message: 'Chart item archived as resolved.' };
  } catch (error) {
    console.error('Clinical item update failed:', error);
    return { success: false, message: 'We could not update this chart item.' };
  }
}

const BlockSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  startTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
  endTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
  reason: z.string().trim().min(2).max(200),
});

export async function createScheduleBlock(input: z.infer<typeof BlockSchema>) {
  const actor = await clinician();
  const parsed = BlockSchema.safeParse(input);
  if (!actor || !parsed.success || parsed.data.startTime >= parsed.data.endTime) return { success: false, message: 'Choose a date and a valid start/end time.' };
  try {
    await sql`
      INSERT INTO doctor_schedule_blocks (doctor_email, doctor_name, block_date, start_time, end_time, reason)
      VALUES (${actor.email}, ${actor.name}, ${parsed.data.date}, ${parsed.data.startTime}, ${parsed.data.endTime}, ${parsed.data.reason})
    `;
    await audit(actor, 'doctor_schedule.block_created', 'doctor_schedule_block', null, parsed.data);
    refreshClinicalViews();
    return { success: true, message: 'Unavailable time saved.' };
  } catch (error) {
    console.error('Schedule block creation failed:', error);
    return { success: false, message: 'We could not save this schedule block.' };
  }
}

export async function cancelScheduleBlock(blockId: string) {
  const actor = await clinician();
  const id = z.string().uuid().safeParse(blockId);
  if (!actor || !id.success) return { success: false, message: 'Unable to update schedule block.' };
  try {
    const [block] = await sql`
      UPDATE doctor_schedule_blocks SET active = FALSE
      WHERE id = ${id.data} AND active = TRUE AND (${actor.role} = 'admin' OR doctor_email = ${actor.email})
      RETURNING id
    `;
    if (!block) return { success: false, message: 'Schedule block not found.' };
    await audit(actor, 'doctor_schedule.block_cancelled', 'doctor_schedule_block', id.data);
    refreshClinicalViews();
    return { success: true, message: 'Schedule block cancelled.' };
  } catch (error) {
    console.error('Schedule block cancellation failed:', error);
    return { success: false, message: 'We could not cancel this schedule block.' };
  }
}

const PrescriptionSchema = z.object({
  patientEmail: z.string().email(), appointmentId: z.string().uuid().optional(),
  medication: z.string().trim().min(2).max(160), strength: z.string().trim().min(1).max(80),
  directions: z.string().trim().min(2).max(1000), quantity: z.coerce.number().int().min(1).max(10000),
  refills: z.coerce.number().int().min(0).max(12), pharmacy: z.string().trim().max(200).optional(),
});

export async function createPrescription(input: z.infer<typeof PrescriptionSchema>) {
  const actor = await clinician();
  const parsed = PrescriptionSchema.safeParse(input);
  if (!actor || !parsed.success) return { success: false, message: 'Complete the prescription details.' };
  try {
    const [patient] = await sql`SELECT email FROM users WHERE email = ${parsed.data.patientEmail} AND role = 'patient' LIMIT 1`;
    if (!patient) return { success: false, message: 'Patient account not found.' };
    if (parsed.data.appointmentId) {
      const [visit] = await sql`SELECT id FROM appointments WHERE id = ${parsed.data.appointmentId} AND patient_email = ${patient.email} LIMIT 1`;
      if (!visit) return { success: false, message: 'The selected appointment does not belong to this patient.' };
    }
    const [prescription] = await sql`
      INSERT INTO prescriptions (patient_email, appointment_id, doctor_email, medication_name, strength, directions, quantity, refills, pharmacy)
      VALUES (${patient.email}, ${parsed.data.appointmentId ?? null}, ${actor.email}, ${parsed.data.medication}, ${parsed.data.strength}, ${parsed.data.directions}, ${parsed.data.quantity}, ${parsed.data.refills}, ${parsed.data.pharmacy ?? ''})
      RETURNING id
    `;
    await audit(actor, 'prescription.created', 'prescription', prescription.id, { patientEmail: patient.email });
    await sql`INSERT INTO notifications (user_email, user_type, type, message) VALUES (${patient.email}, 'patient', 'prescription_created', 'A prescription was sent to the pharmacy for verification.')`;
    refreshClinicalViews(patient.email);
    return { success: true, message: 'Prescription sent to the pharmacy verification queue.' };
  } catch (error) {
    console.error('Prescription creation failed:', error);
    return { success: false, message: 'We could not create the prescription.' };
  }
}

export async function updatePrescriptionStatus(prescriptionId: string, nextStatus: string, pharmacistNote = '') {
  const session = await auth();
  const id = z.string().uuid().safeParse(prescriptionId);
  const note = z.string().trim().max(1000).safeParse(pharmacistNote);
  const role = session?.user.role;
  const parsedStatus = z.enum(['Verified', 'Dispensing', 'Dispensed', 'Voided']).safeParse(nextStatus);
  if (!session?.user.email || !id.success || !note.success || !parsedStatus.success || !role || !['admin', 'doctor', 'pharmacist'].includes(role)) return { success: false, message: 'Unable to update prescription.' };
  nextStatus = parsedStatus.data;
  const actor = { email: session.user.email, role };
  if (role === 'pharmacist' && !['Verified', 'Dispensing', 'Dispensed'].includes(nextStatus)) return { success: false, message: 'Invalid pharmacy status.' };
  if (role !== 'pharmacist' && nextStatus !== 'Voided') return { success: false, message: 'Doctors can only void an active prescription.' };
  try {
    const [row] = await sql`
      UPDATE prescriptions SET
        status = ${nextStatus}, pharmacist_note = CASE WHEN ${role} = 'pharmacist' AND ${note.data} <> '' THEN ${note.data} ELSE pharmacist_note END,
        verified_at = CASE WHEN ${nextStatus} = 'Verified' THEN COALESCE(verified_at, NOW()) ELSE verified_at END,
        dispensed_at = CASE WHEN ${nextStatus} = 'Dispensed' THEN COALESCE(dispensed_at, NOW()) ELSE dispensed_at END,
        voided_at = CASE WHEN ${nextStatus} = 'Voided' THEN NOW() ELSE voided_at END
      WHERE id = ${id.data} AND status NOT IN ('Voided', 'Dispensed')
        AND ((${role} = 'admin' AND ((${nextStatus} = 'Verified' AND status = 'Pending verification') OR (${nextStatus} = 'Dispensing' AND status = 'Verified') OR (${nextStatus} = 'Dispensed' AND status = 'Dispensing') OR (${nextStatus} = 'Voided' AND status IN ('Pending verification', 'Verified', 'Dispensing'))))
          OR (${role} = 'pharmacist' AND ((${nextStatus} = 'Verified' AND status = 'Pending verification') OR (${nextStatus} = 'Dispensing' AND status = 'Verified') OR (${nextStatus} = 'Dispensed' AND status = 'Dispensing')))
          OR (${role} = 'doctor' AND ${nextStatus} = 'Voided' AND doctor_email = ${actor.email} AND status = 'Pending verification'))
      RETURNING patient_email
    `;
    if (!row) return { success: false, message: 'Prescription not found or its status no longer allows this update.' };
    await audit(actor, 'prescription.status_updated', 'prescription', id.data, { status: nextStatus });
    refreshClinicalViews(row.patient_email);
    revalidatePath('/dashboard/pharmacy/pharmacist');
    return { success: true, message: `Prescription ${nextStatus.toLowerCase()}.` };
  } catch (error) {
    console.error('Prescription update failed:', error);
    return { success: false, message: 'We could not update the prescription.' };
  }
}

const ReferralSchema = z.object({
  patientEmail: z.string().email(), appointmentId: z.string().uuid().optional(),
  specialty: z.string().trim().min(2).max(120), destination: z.string().trim().max(200).optional(),
  reason: z.string().trim().min(5).max(3000), urgency: z.enum(['routine', 'urgent']),
});

export async function createClinicalReferral(input: z.infer<typeof ReferralSchema>) {
  const actor = await clinician();
  const parsed = ReferralSchema.safeParse(input);
  if (!actor || !parsed.success) return { success: false, message: 'Complete the referral details.' };
  try {
    const [patient] = await sql`SELECT email FROM users WHERE email = ${parsed.data.patientEmail} AND role = 'patient' LIMIT 1`;
    if (!patient) return { success: false, message: 'Patient account not found.' };
    if (parsed.data.appointmentId) {
      const [visit] = await sql`SELECT id FROM appointments WHERE id = ${parsed.data.appointmentId} AND patient_email = ${patient.email} LIMIT 1`;
      if (!visit) return { success: false, message: 'The selected appointment does not belong to this patient.' };
    }
    const [referral] = await sql`
      INSERT INTO clinical_referrals (patient_email, appointment_id, doctor_email, specialty, destination, reason, urgency)
      VALUES (${patient.email}, ${parsed.data.appointmentId ?? null}, ${actor.email}, ${parsed.data.specialty}, ${parsed.data.destination ?? ''}, ${parsed.data.reason}, ${parsed.data.urgency})
      RETURNING id
    `;
    await audit(actor, 'clinical_referral.created', 'clinical_referral', referral.id, { patientEmail: patient.email, urgency: parsed.data.urgency });
    refreshClinicalViews(patient.email);
    return { success: true, message: 'Referral submitted for approval.' };
  } catch (error) {
    console.error('Referral creation failed:', error);
    return { success: false, message: 'We could not save the referral.' };
  }
}

export async function updateClinicalReferral(referralId: string, nextStatus: string) {
  const actor = await clinician();
  const id = z.string().uuid().safeParse(referralId);
  if (!actor || !id.success || !['Approved', 'Sent', 'Completed', 'Cancelled'].includes(nextStatus)) return { success: false, message: 'Unable to update referral.' };
  try {
    const [row] = await sql`
      UPDATE clinical_referrals SET status = ${nextStatus},
        approved_at = CASE WHEN ${nextStatus} = 'Approved' THEN COALESCE(approved_at, NOW()) ELSE approved_at END,
        sent_at = CASE WHEN ${nextStatus} = 'Sent' THEN COALESCE(sent_at, NOW()) ELSE sent_at END,
        completed_at = CASE WHEN ${nextStatus} = 'Completed' THEN COALESCE(completed_at, NOW()) ELSE completed_at END
      WHERE id = ${id.data} AND archived_at IS NULL
        AND ((${nextStatus} = 'Approved' AND status = 'Needs approval') OR (${nextStatus} = 'Sent' AND status = 'Approved') OR (${nextStatus} = 'Completed' AND status = 'Sent') OR (${nextStatus} = 'Cancelled' AND status IN ('Needs approval', 'Approved')))
        AND (${actor.role} = 'admin' OR doctor_email = ${actor.email})
      RETURNING patient_email
    `;
    if (!row) return { success: false, message: 'Referral not found or cannot move to that status.' };
    await audit(actor, 'clinical_referral.status_updated', 'clinical_referral', id.data, { status: nextStatus });
    if (nextStatus === 'Sent') await sql`INSERT INTO notifications (user_email, user_type, type, message) VALUES (${row.patient_email}, 'patient', 'referral_sent', 'Your specialist referral has been sent.')`;
    refreshClinicalViews(row.patient_email);
    return { success: true, message: `Referral marked ${nextStatus.toLowerCase()}.` };
  } catch (error) {
    console.error('Referral update failed:', error);
    return { success: false, message: 'We could not update the referral.' };
  }
}
