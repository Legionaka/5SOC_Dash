'use server';

import { auth } from '@/auth';
import { revalidatePath } from 'next/cache';
import postgres from 'postgres';
import { z } from 'zod';

const sql = postgres(process.env.POSTGRES_URL!, { ssl: 'require' });

async function recordPatientAudit(email: string, action: string, entityType: string, entityId?: string, metadata: Record<string, unknown> = {}) {
  try {
    await sql`
      INSERT INTO audit_logs (actor_email, actor_role, action, entity_type, entity_id, metadata)
      VALUES (${email}, 'patient', ${action}, ${entityType}, ${entityId ?? null}, ${sql.json(metadata as any)})
    `;
  } catch (error) {
    console.error('Audit log unavailable:', error);
  }
}

async function notifyPatient(email: string, type: string, message: string) {
  try {
    await sql`
      INSERT INTO notifications (user_email, user_type, type, message)
      VALUES (${email}, 'patient', ${type}, ${message})
    `;
  } catch (error) {
    console.error('Patient notification unavailable:', error);
  }
}

const BookingSchema = z.object({
  consultationType: z.string().min(1),
  doctor: z.string().min(1),
  specialty: z.string().min(1),
  appointmentDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  appointmentTime: z.string().min(1),
  reason: z.string().min(1),
});

export type BookingInput = z.infer<typeof BookingSchema>;

const RescheduleSchema = z.object({
  appointmentId: z.string().uuid(),
  appointmentDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  appointmentTime: z.string().min(1),
});

const ProfileSchema = z.object({
  name: z.string().trim().min(2).max(120),
  dateOfBirth: z.string().optional(),
  phone: z.string().trim().max(40).optional(),
  nationalId: z.string().trim().max(80).optional(),
  pharmacyPreference: z.string().trim().max(120).optional(),
});

export async function updatePatientProfile(input: z.infer<typeof ProfileSchema>) {
  const session = await auth();
  const email = session?.user.email;
  if (!email || session.user.role !== 'patient') return { success: false, message: 'You are not authorized to update this profile.' };
  const validated = ProfileSchema.safeParse(input);
  if (!validated.success) return { success: false, message: 'Please check the profile details.' };
  try {
    await sql`
      UPDATE users
      SET name = ${validated.data.name}, date_of_birth = ${validated.data.dateOfBirth || null},
          phone = ${validated.data.phone || null}, national_id = ${validated.data.nationalId || null},
          pharmacy_preference = ${validated.data.pharmacyPreference || null}
      WHERE email = ${email} AND role = 'patient'
    `;
    revalidatePath('/dashboard/user');
    revalidatePath('/dashboard/user/profile');
    await recordPatientAudit(email, 'profile.updated', 'patient', undefined, { fields: Object.keys(validated.data) });
    await notifyPatient(email, 'profile_updated', 'Your patient profile was updated successfully.');
    return { success: true, message: 'Profile updated.' };
  } catch (error) {
    console.error('Failed to update patient profile:', error);
    return { success: false, message: 'We could not update your profile.' };
  }
}

export async function markPatientNotificationRead(notificationId: string) {
  const session = await auth();
  const email = session?.user.email;
  if (!email || session.user.role !== 'patient' || !z.string().uuid().safeParse(notificationId).success) {
    return { success: false, message: 'Unable to update notification.' };
  }
  await sql`UPDATE notifications SET read = TRUE WHERE id = ${notificationId} AND user_email = ${email} AND user_type = 'patient'`;
  revalidatePath('/dashboard/user');
  revalidatePath('/dashboard/user/notifications');
  return { success: true, message: 'Notification marked as read.' };
}

export async function bookPatientAppointment(input: BookingInput) {
  const session = await auth();
  const email = session?.user.email;

  if (!email || session.user.role !== 'patient') {
    return { success: false, message: 'You are not authorized to book an appointment.' };
  }

  const validated = BookingSchema.safeParse(input);
  if (!validated.success) {
    return { success: false, message: 'Please complete all booking details.' };
  }

  const { consultationType, doctor, specialty, appointmentDate, appointmentTime, reason } = validated.data;
  const selectedDate = new Date(`${appointmentDate}T00:00:00`);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  if (Number.isNaN(selectedDate.getTime()) || selectedDate < today) {
    return { success: false, message: 'Please select a current or future date.' };
  }

  try {
    const result = await sql.begin(async (transaction) => {
      // Serialize bookings for the same doctor/day so the capacity check cannot
      // be bypassed by two requests arriving at the same time.
      await transaction`SELECT pg_advisory_xact_lock(hashtext(${`${doctor}:${appointmentDate}`}))`;

      const [doctorRecord] = await transaction`
        SELECT id, name, specialty
        FROM doctors
        WHERE id = ${doctor} AND specialty = ${specialty} AND active = TRUE
        LIMIT 1
      `;
      const [consultationRecord] = await transaction`
        SELECT id, label, examples, fee_cents
        FROM consultation_types
        WHERE id = ${consultationType} AND active = TRUE
        LIMIT 1
      `;
      const [availableSlot] = await transaction`
        SELECT doctor_id
        FROM doctor_availability
        WHERE doctor_id = ${doctor}
          AND day_of_week = ${selectedDate.getDay()}
          AND appointment_time = ${appointmentTime}
          AND active = TRUE
        LIMIT 1
      `;

      if (!doctorRecord || !consultationRecord || !availableSlot) {
        return { success: false, message: 'The selected doctor, consultation, or time is unavailable.' };
      }

      const [dailyCount] = await transaction`
        SELECT COUNT(*)::int AS count
        FROM appointments
        WHERE doctor_id = ${doctorRecord.id}
          AND appointment_date = ${appointmentDate}
          AND status NOT IN ('Cancelled', 'Rejected')
      `;

      if (Number(dailyCount?.count ?? 0) >= 20) {
        return { success: false, message: 'This doctor has reached the daily booking limit.' };
      }

      const [existingSlot] = await transaction`
        SELECT id
        FROM appointments
        WHERE doctor_id = ${doctorRecord.id}
          AND appointment_date = ${appointmentDate}
          AND appointment_time = ${appointmentTime}
          AND status NOT IN ('Cancelled', 'Rejected')
        LIMIT 1
      `;

      if (existingSlot) {
        return { success: false, message: 'That appointment slot is no longer available.' };
      }

      await transaction`
        INSERT INTO appointments (
          patient_email,
          doctor_id,
          doctor_name,
          specialty,
          consultation_id,
          appointment_date,
          appointment_time,
          reason,
          fee_cents,
          status
        )
        VALUES (
          ${email},
          ${doctorRecord.id},
          ${doctorRecord.name},
          ${specialty},
          ${consultationRecord.id},
          ${appointmentDate},
          ${appointmentTime},
          ${`${consultationRecord.label}: ${reason}`},
          ${consultationRecord.fee_cents},
          'Pending'
        )
      `;

      return { success: true, message: 'Appointment request saved.' };
    });

    if (result.success) {
      await recordPatientAudit(email, 'appointment.created', 'appointment', undefined, { appointmentDate, appointmentTime, doctor });
      await notifyPatient(email, 'appointment_created', `Your appointment request for ${appointmentDate} at ${appointmentTime} was saved.`);
      revalidatePath('/dashboard/user');
    }

    return result;
  } catch (error) {
    console.error('Failed to book patient appointment:', error);
    return { success: false, message: 'We could not save the appointment. Please try again.' };
  }
}

export async function reschedulePatientAppointment(input: z.infer<typeof RescheduleSchema>) {
  const session = await auth();
  const email = session?.user.email;
  if (!email || session.user.role !== 'patient') {
    return { success: false, message: 'You are not authorized to reschedule this appointment.' };
  }

  const validated = RescheduleSchema.safeParse(input);
  if (!validated.success) return { success: false, message: 'Please choose a valid date and time.' };

  const { appointmentId, appointmentDate, appointmentTime } = validated.data;
  const selectedDate = new Date(`${appointmentDate}T00:00:00`);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  if (Number.isNaN(selectedDate.getTime()) || selectedDate < today) {
    return { success: false, message: 'Please select a current or future date.' };
  }

  try {
    const result = await sql.begin(async (transaction) => {
      const [appointment] = await transaction`
        SELECT id, doctor_id, doctor_name
        FROM appointments
        WHERE id = ${appointmentId} AND patient_email = ${email}
          AND status NOT IN ('Cancelled', 'Completed')
        LIMIT 1
      `;
      if (!appointment) return { success: false, message: 'Appointment not found or no longer changeable.' };

      await transaction`SELECT pg_advisory_xact_lock(hashtext(${`${appointment.doctor_id}:${appointmentDate}`}))`;
      const [availableSlot] = await transaction`
        SELECT doctor_id FROM doctor_availability
        WHERE doctor_id = ${appointment.doctor_id}
          AND day_of_week = ${selectedDate.getDay()}
          AND appointment_time = ${appointmentTime}
          AND active = TRUE
        LIMIT 1
      `;
      const [existingSlot] = await transaction`
        SELECT id FROM appointments
        WHERE doctor_id = ${appointment.doctor_id}
          AND appointment_date = ${appointmentDate}
          AND appointment_time = ${appointmentTime}
          AND status NOT IN ('Cancelled', 'Rejected')
          AND id <> ${appointmentId}
        LIMIT 1
      `;
      if (!availableSlot || existingSlot) return { success: false, message: 'That appointment slot is unavailable.' };

      await transaction`
        UPDATE appointments
        SET appointment_date = ${appointmentDate}, appointment_time = ${appointmentTime}, status = 'Pending'
        WHERE id = ${appointmentId} AND patient_email = ${email}
      `;
      return { success: true, message: 'Appointment rescheduled.' };
    });
    if (result.success) {
      await recordPatientAudit(email, 'appointment.rescheduled', 'appointment', appointmentId, { appointmentDate, appointmentTime });
      await notifyPatient(email, 'appointment_rescheduled', `Your appointment was rescheduled to ${appointmentDate} at ${appointmentTime}.`);
      revalidatePath('/dashboard/user');
    }
    return result;
  } catch (error) {
    console.error('Failed to reschedule patient appointment:', error);
    return { success: false, message: 'We could not reschedule the appointment.' };
  }
}

export async function cancelPatientAppointment(appointmentId: string) {
  const session = await auth();
  const email = session?.user.email;
  if (!email || session.user.role !== 'patient') {
    return { success: false, message: 'You are not authorized to cancel this appointment.' };
  }
  if (!z.string().uuid().safeParse(appointmentId).success) {
    return { success: false, message: 'Invalid appointment.' };
  }

  try {
    const result = await sql.begin(async (transaction) => {
      const [appointment] = await transaction`
        SELECT id, fee_cents, status
        FROM appointments
        WHERE id = ${appointmentId} AND patient_email = ${email}
        LIMIT 1
      `;
      if (!appointment || ['Cancelled', 'Completed'].includes(appointment.status)) {
        return { success: false, message: 'This appointment cannot be cancelled.' };
      }

      await transaction`
        UPDATE appointments SET status = 'Cancelled'
        WHERE id = ${appointmentId} AND patient_email = ${email}
      `;
      if (Number(appointment.fee_cents ?? 0) > 0) {
        await transaction`
          INSERT INTO wallet_transactions (patient_email, amount, status, description)
          VALUES (${email}, ${appointment.fee_cents}, 'paid', ${`Refund for appointment ${appointmentId}`})
        `;
      }
      return { success: true, message: 'Appointment cancelled and refund added to your wallet.' };
    });
    if (result.success) {
      await recordPatientAudit(email, 'appointment.cancelled', 'appointment', appointmentId);
      await notifyPatient(email, 'appointment_cancelled', 'Your appointment was cancelled. Any eligible refund was added to your wallet.');
      revalidatePath('/dashboard/user');
    }
    return result;
  } catch (error) {
    console.error('Failed to cancel patient appointment:', error);
    return { success: false, message: 'We could not cancel the appointment.' };
  }
}

export async function requestWalletFunds(amountCents: number) {
  const session = await auth();
  const email = session?.user.email;
  if (!email || session.user.role !== 'patient') return { success: false, message: 'You are not authorized to fund this wallet.' };
  if (!Number.isInteger(amountCents) || amountCents < 100 || amountCents > 1000000) {
    return { success: false, message: 'Enter an amount between $1.00 and $10,000.00.' };
  }
  try {
    await sql`
      INSERT INTO wallet_transactions (patient_email, amount, status, description)
      VALUES (${email}, ${amountCents}, 'pending', 'Wallet funding request pending payment')
    `;
    await recordPatientAudit(email, 'wallet.funding_requested', 'wallet_transaction', undefined, { amountCents });
    await notifyPatient(email, 'wallet_pending', 'Your wallet funding request is pending payment confirmation.');
    revalidatePath('/dashboard/user');
    return { success: true, message: 'Funding request created and marked pending payment.' };
  } catch (error) {
    console.error('Failed to request wallet funds:', error);
    return { success: false, message: 'We could not create the funding request.' };
  }
}

export async function requestWalletRefund(transactionId: string, reason: string) {
  const session = await auth();
  const email = session?.user.email;
  if (!email || session.user.role !== 'patient') return { success: false, message: 'You are not authorized to request a refund.' };
  if (!z.string().uuid().safeParse(transactionId).success || reason.trim().length < 5) {
    return { success: false, message: 'Select a transaction and provide a short reason.' };
  }

  try {
    const [transaction] = await sql`
      SELECT id, status FROM wallet_transactions
      WHERE id = ${transactionId} AND patient_email = ${email}
      LIMIT 1
    `;
    if (!transaction || transaction.status !== 'paid') {
      return { success: false, message: 'Only completed payments can be refunded.' };
    }
    const [existingRequest] = await sql`
      SELECT id FROM refund_requests
      WHERE wallet_transaction_id = ${transactionId} AND patient_email = ${email}
        AND status = 'Pending'
      LIMIT 1
    `;
    if (existingRequest) return { success: false, message: 'A refund request is already pending for this payment.' };

    await sql`
      INSERT INTO refund_requests (patient_email, wallet_transaction_id, reason)
      VALUES (${email}, ${transactionId}, ${reason.trim()})
    `;
    await recordPatientAudit(email, 'wallet.refund_requested', 'wallet_transaction', transactionId, { reason: reason.trim() });
    await notifyPatient(email, 'refund_requested', 'Your refund request was submitted for staff review.');
    revalidatePath('/dashboard/user');
    return { success: true, message: 'Refund request submitted for staff review.' };
  } catch (error) {
    console.error('Failed to request wallet refund:', error);
    return { success: false, message: 'We could not submit the refund request.' };
  }
}
