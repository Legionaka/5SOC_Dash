'use server';

import { auth } from '@/auth';
import { revalidatePath } from 'next/cache';
import postgres from 'postgres';
import { z } from 'zod';

const sql = postgres(process.env.POSTGRES_URL!, { ssl: 'require' });

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
    if (result.success) revalidatePath('/dashboard/user');
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
    if (result.success) revalidatePath('/dashboard/user');
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
    revalidatePath('/dashboard/user');
    return { success: true, message: 'Refund request submitted for staff review.' };
  } catch (error) {
    console.error('Failed to request wallet refund:', error);
    return { success: false, message: 'We could not submit the refund request.' };
  }
}
