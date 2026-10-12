'use server';

import { auth } from '@/auth';
import { revalidatePath } from 'next/cache';
import postgres from 'postgres';
import { z } from 'zod';

const sql = postgres(process.env.POSTGRES_URL!, { ssl: 'require' });
const TriageSchema = z.object({
  appointmentId: z.string().uuid(),
  bloodPressure: z.string().trim().max(20).optional(),
  pulse: z.number().int().min(20).max(300).nullable(),
  temperatureC: z.number().min(25).max(45).nullable(),
  weightKg: z.number().min(0.2).max(500).nullable(),
  heightCm: z.number().min(10).max(300).nullable(),
  initialComplaint: z.string().trim().min(3).max(2000),
  submit: z.boolean(),
});

export async function savePatientTriage(input: z.infer<typeof TriageSchema>) {
  const session = await auth();
  const parsed = TriageSchema.safeParse(input);
  if (!session?.user.email || !['admin', 'nurse'].includes(session.user.role ?? '') || !parsed.success) {
    return { success: false, message: 'Check the triage details and your access.' };
  }
  const value = parsed.data;
  try {
    const [triage] = await sql`
      INSERT INTO patient_triage (appointment_id, patient_email, nurse_email, blood_pressure, pulse, temperature_c, weight_kg, height_cm, initial_complaint, status, submitted_at)
      SELECT a.id, a.patient_email, ${session.user.email}, ${value.bloodPressure ?? ''}, ${value.pulse}, ${value.temperatureC}, ${value.weightKg}, ${value.heightCm}, ${value.initialComplaint}, ${value.submit ? 'Submitted' : 'Draft'}, CASE WHEN ${value.submit} THEN NOW() ELSE NULL END
      FROM appointments a
      WHERE a.id = ${value.appointmentId} AND a.appointment_date = CURRENT_DATE
        AND a.status NOT IN ('Cancelled', 'Rejected', 'Completed')
        AND a.check_in_status IN ('Not checked in', 'Checked in')
      ON CONFLICT (appointment_id) DO UPDATE SET
        nurse_email = EXCLUDED.nurse_email, blood_pressure = EXCLUDED.blood_pressure,
        pulse = EXCLUDED.pulse, temperature_c = EXCLUDED.temperature_c,
        weight_kg = EXCLUDED.weight_kg, height_cm = EXCLUDED.height_cm,
        initial_complaint = EXCLUDED.initial_complaint,
        status = CASE WHEN EXCLUDED.status = 'Submitted' THEN 'Submitted' ELSE patient_triage.status END,
        submitted_at = CASE WHEN EXCLUDED.status = 'Submitted' THEN COALESCE(patient_triage.submitted_at, NOW()) ELSE patient_triage.submitted_at END,
        updated_at = NOW()
      WHERE patient_triage.status IN ('Draft', 'Submitted')
        AND EXISTS (SELECT 1 FROM appointments a WHERE a.id = patient_triage.appointment_id AND a.check_in_status IN ('Not checked in', 'Checked in') AND a.status NOT IN ('Cancelled', 'Rejected', 'Completed'))
      RETURNING patient_email, id, status
    `;
    if (!triage) return { success: false, message: 'Triage is closed because the appointment is no longer in the check-in window.' };
    await sql`
      INSERT INTO audit_logs (actor_email, actor_role, action, entity_type, entity_id, metadata)
      VALUES (${session.user.email}, ${session.user.role ?? 'nurse'}, 'patient_triage.saved', 'patient_triage', ${triage.id}, ${sql.json({ patientEmail: triage.patient_email, status: triage.status })})
    `;
    revalidatePath('/dashboard/nurse');
    revalidatePath('/dashboard/queue');
    revalidatePath('/dashboard/doctor');
    revalidatePath('/dashboard/doctor/patients');
    return { success: true, message: value.submit ? 'Triage submitted to the care team.' : 'Triage draft saved.' };
  } catch (error) {
    console.error('Patient triage save failed:', error);
    return { success: false, message: 'We could not save triage.' };
  }
}
