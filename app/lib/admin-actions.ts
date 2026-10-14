'use server';

import { auth, signOut } from '@/auth';
import bcrypt from 'bcryptjs';
import postgres from 'postgres';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { createAdminClient } from '@/app/lib/supabase/admin';
import { requireAdmin } from '@/app/lib/security';

const sql = postgres(process.env.POSTGRES_URL!, { ssl: 'require' });
const StaffSchema = z.object({
  name: z.string().trim().min(2).max(255),
  email: z.string().trim().email().max(320),
  temporaryPassword: z.string().min(12).max(128),
  role: z.enum(['doctor', 'nurse', 'pharmacist', 'pharmacy_reception', 'pharmacy_stocker']),
});

export async function createStaffAccount(input: z.infer<typeof StaffSchema>) {
  const session = await requireAdmin();
  const actorEmail = session?.user.email;
  const parsed = StaffSchema.safeParse(input);
  if (!actorEmail || !parsed.success) {
    return { success: false, message: 'Enter valid staff details. Admin access is required.' };
  }
  const normalizedEmail = parsed.data.email.toLowerCase();
  const supabaseAdmin = createAdminClient();
  const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
    email: normalizedEmail,
    password: parsed.data.temporaryPassword,
    email_confirm: true,
    user_metadata: { name: parsed.data.name },
  });
  if (authError || !authUser.user) {
    if (authError?.message.toLowerCase().includes('already')) {
      return { success: false, message: 'An account already uses that email address.' };
    }
    console.error('Supabase staff account creation failed:', authError);
    return { success: false, message: 'We could not create this staff account.' };
  }
  try {
    const password = await bcrypt.hash(parsed.data.temporaryPassword, 12);
    const created = await sql.begin(async (transaction) => {
      const [account] = await transaction`
        INSERT INTO users (name, email, password, role, must_change_password)
        VALUES (${parsed.data.name}, ${normalizedEmail}, ${password}, ${parsed.data.role}, TRUE)
        RETURNING id, email, role
      `;
      await transaction`
        UPDATE users SET auth_user_id = ${authUser.user.id} WHERE id = ${account.id}
      `;
      await transaction`
        INSERT INTO audit_logs (actor_email, actor_role, action, entity_type, entity_id, metadata)
        VALUES (${actorEmail}, 'admin', 'staff_account.created', 'user', ${account.id}, ${transaction.json({ email: account.email, role: account.role })})
      `;
      return account;
    });
    revalidatePath('/dashboard/admin/staff');
    revalidatePath('/dashboard');
    return { success: true, message: `Account created for ${created.email}. Share the temporary password securely; the user must change it on first sign-in.` };
  } catch (error) {
    await supabaseAdmin.auth.admin.deleteUser(authUser.user.id);
    if (typeof error === 'object' && error !== null && 'code' in error && error.code === '23505') {
      return { success: false, message: 'An account already uses that email address.' };
    }
    console.error('Staff account creation failed:', error);
    return { success: false, message: 'We could not create this staff account.' };
  }
}

const StaffIdSchema = z.string().uuid();
const StaffPasswordResetSchema = z.object({
  staffId: StaffIdSchema,
  temporaryPassword: z.string().min(12).max(128),
  reason: z.string().trim().min(5).max(500),
});

const PatientSchema = z.object({
  name: z.string().trim().min(2).max(255),
  email: z.string().trim().email().max(320),
  temporaryPassword: z.string().min(12).max(128),
  dateOfBirth: z.string().trim().max(10).optional(),
  phone: z.string().trim().max(40).optional(),
  nationalId: z.string().trim().max(80).optional(),
  pharmacyPreference: z.string().trim().max(120).optional(),
  emergencyContact: z.string().trim().max(160).optional(),
  preferredContactMethod: z.enum(['email', 'phone']).default('email'),
});

const PatientUpdateSchema = PatientSchema.omit({ temporaryPassword: true }).extend({ patientId: z.string().uuid() });

export async function createPatient(input: z.infer<typeof PatientSchema>) {
  const session = await requireAdmin();
  const parsed = PatientSchema.safeParse(input);
  if (!session.user.email || !parsed.success) return { success: false, message: 'Enter valid patient details.' };
  const normalizedEmail = parsed.data.email.toLowerCase();
  const supabaseAdmin = createAdminClient();
  const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
    email: normalizedEmail, password: parsed.data.temporaryPassword, email_confirm: true, user_metadata: { name: parsed.data.name },
  });
  if (authError || !authUser.user) {
    if (authError?.message.toLowerCase().includes('already')) return { success: false, message: 'An account already uses that email address.' };
    console.error('Supabase patient account creation failed:', authError);
    return { success: false, message: 'We could not create this patient account.' };
  }
  try {
    const password = await bcrypt.hash(parsed.data.temporaryPassword, 12);
    const created = await sql.begin(async (transaction) => {
      const [patient] = await transaction`
        INSERT INTO users (name, email, password, role, must_change_password, auth_user_id, date_of_birth, phone, national_id, pharmacy_preference, emergency_contact, preferred_contact_method)
        VALUES (${parsed.data.name}, ${normalizedEmail}, ${password}, 'patient', TRUE, ${authUser.user.id}, ${parsed.data.dateOfBirth || null}, ${parsed.data.phone || null}, ${parsed.data.nationalId || null}, ${parsed.data.pharmacyPreference || null}, ${parsed.data.emergencyContact || null}, ${parsed.data.preferredContactMethod})
        RETURNING id, email
      `;
      await transaction`INSERT INTO audit_logs (actor_email, actor_role, action, entity_type, entity_id, metadata) VALUES (${session.user.email}, 'admin', 'patient.created', 'user', ${patient.id}, ${transaction.json({ email: patient.email })})`;
      return patient;
    });
    revalidatePath('/dashboard/customers'); revalidatePath('/dashboard');
    return { success: true, message: `Patient account created for ${created.email}.` };
  } catch (error) {
    await supabaseAdmin.auth.admin.deleteUser(authUser.user.id);
    if (typeof error === 'object' && error !== null && 'code' in error && error.code === '23505') return { success: false, message: 'An account already uses that email address.' };
    console.error('Patient account creation failed:', error);
    return { success: false, message: 'We could not create this patient account.' };
  }
}

export async function updatePatient(input: z.infer<typeof PatientUpdateSchema>) {
  const session = await requireAdmin();
  const parsed = PatientUpdateSchema.safeParse(input);
  if (!session.user.email || !parsed.success) return { success: false, message: 'Enter valid patient details.' };
  const normalizedEmail = parsed.data.email.toLowerCase();
  try {
    const [existing] = await sql`SELECT id, email, auth_user_id FROM users WHERE id = ${parsed.data.patientId} AND role = 'patient' LIMIT 1`;
    if (!existing) return { success: false, message: 'The patient account was not found.' };
    if (existing.email.toLowerCase() !== normalizedEmail && existing.auth_user_id) {
      const { error } = await createAdminClient().auth.admin.updateUserById(existing.auth_user_id, { email: normalizedEmail, email_confirm: true });
      if (error) return { success: false, message: 'We could not update the patient login email.' };
    }
    const [updated] = await sql`
      UPDATE users SET name = ${parsed.data.name}, email = ${normalizedEmail}, date_of_birth = ${parsed.data.dateOfBirth || null}, phone = ${parsed.data.phone || null}, national_id = ${parsed.data.nationalId || null}, pharmacy_preference = ${parsed.data.pharmacyPreference || null}, emergency_contact = ${parsed.data.emergencyContact || null}, preferred_contact_method = ${parsed.data.preferredContactMethod}
      WHERE id = ${parsed.data.patientId} AND role = 'patient' RETURNING id, email
    `;
    await sql`INSERT INTO audit_logs (actor_email, actor_role, action, entity_type, entity_id, metadata) VALUES (${session.user.email}, 'admin', 'patient.updated', 'user', ${updated.id}, ${sql.json({ email: updated.email })})`;
    revalidatePath('/dashboard/customers'); revalidatePath('/dashboard/user');
    return { success: true, message: 'Patient details updated.' };
  } catch (error) {
    if (typeof error === 'object' && error !== null && 'code' in error && error.code === '23505') return { success: false, message: 'An account already uses that email address.' };
    console.error('Patient update failed:', error);
    return { success: false, message: 'We could not update this patient.' };
  }
}

export async function deletePatient(patientId: string) {
  const session = await requireAdmin();
  const parsedId = z.string().uuid().safeParse(patientId);
  if (!session.user.email || !parsedId.success) return { success: false, message: 'The patient account was not found.' };
  try {
    const [patient] = await sql`SELECT id, email, auth_user_id FROM users WHERE id = ${parsedId.data} AND role = 'patient' LIMIT 1`;
    if (!patient) return { success: false, message: 'The patient account was not found.' };
    await sql`INSERT INTO audit_logs (actor_email, actor_role, action, entity_type, entity_id, metadata) VALUES (${session.user.email}, 'admin', 'patient.deleted', 'user', ${patient.id}, ${sql.json({ email: patient.email })})`;
    await sql`DELETE FROM users WHERE id = ${patient.id} AND role = 'patient'`;
    if (patient.auth_user_id) {
      const { error } = await createAdminClient().auth.admin.deleteUser(patient.auth_user_id);
      if (error) console.error('Supabase patient auth cleanup failed:', error);
    }
    revalidatePath('/dashboard/customers'); revalidatePath('/dashboard');
    return { success: true, message: `${patient.email} was deleted.` };
  } catch (error) {
    console.error('Patient deletion failed:', error);
    return { success: false, message: 'This patient could not be deleted. Existing clinical records may depend on the account.' };
  }
}

export async function setStaffAccountActive(staffId: string, active: boolean, reason: string) {
  const session = await requireAdmin();
  const parsedId = StaffIdSchema.safeParse(staffId);
  const parsedReason = z.string().trim().min(5).max(500).safeParse(reason);
  if (!parsedId.success || !parsedReason.success) {
    return { success: false, message: 'Provide a valid account and a reason of at least 5 characters.' };
  }
  try {
    const [staff] = await sql`
      UPDATE users
      SET active = ${active},
          disabled_at = CASE WHEN ${active} THEN NULL ELSE NOW() END,
          disabled_by = CASE WHEN ${active} THEN NULL ELSE ${session.user.email} END
      WHERE id = ${parsedId.data} AND role <> 'admin'
      RETURNING id, email, auth_user_id
    `;
    if (!staff) return { success: false, message: 'The staff account was not found or cannot be changed.' };
    if (!active && staff.auth_user_id) {
      await createAdminClient().auth.admin.signOut(staff.auth_user_id, 'global');
    }
    await sql`
      INSERT INTO audit_logs (actor_email, actor_role, action, entity_type, entity_id, metadata, reason)
      VALUES (${session.user.email}, 'admin', ${active ? 'staff_account.enabled' : 'staff_account.disabled'}, 'user', ${staff.id}, ${sql.json({ email: staff.email })}, ${parsedReason.data})
    `;
    revalidatePath('/dashboard/admin/staff');
    return { success: true, message: `${staff.email} was ${active ? 'enabled' : 'disabled'}.` };
  } catch (error) {
    console.error('Staff account status update failed:', error);
    return { success: false, message: 'We could not update that staff account.' };
  }
}

export async function resetStaffPassword(input: z.infer<typeof StaffPasswordResetSchema>) {
  const session = await requireAdmin();
  const parsed = StaffPasswordResetSchema.safeParse(input);
  if (!parsed.success) return { success: false, message: 'Provide a valid password and a reason.' };
  const supabaseAdmin = createAdminClient();
  try {
    const password = await bcrypt.hash(parsed.data.temporaryPassword, 12);
    const result = await sql.begin(async (transaction) => {
      const [staff] = await transaction`
        SELECT id, email, auth_user_id FROM users
        WHERE id = ${parsed.data.staffId} AND role <> 'admin' AND active = TRUE
        FOR UPDATE
      `;
      if (!staff?.auth_user_id) return null;
      const { error } = await supabaseAdmin.auth.admin.updateUserById(staff.auth_user_id, {
        password: parsed.data.temporaryPassword,
      });
      if (error) throw new Error(`Supabase password reset failed: ${error.message}`);
      await transaction`
        UPDATE users SET password = ${password}, must_change_password = TRUE, password_changed_at = NULL
        WHERE id = ${staff.id}
      `;
      await transaction`
        INSERT INTO audit_logs (actor_email, actor_role, action, entity_type, entity_id, metadata, reason)
        VALUES (${session.user.email}, 'admin', 'staff_account.password_reset', 'user', ${staff.id}, ${transaction.json({ email: staff.email })}, ${parsed.data.reason})
      `;
      return staff;
    });
    if (!result) return { success: false, message: 'The active staff account was not found.' };
    await supabaseAdmin.auth.admin.signOut(result.auth_user_id, 'global');
    revalidatePath('/dashboard/admin/staff');
    return { success: true, message: `A new temporary password was set for ${result.email}.` };
  } catch (error) {
    console.error('Staff password reset failed:', error);
    return { success: false, message: 'We could not reset that staff password.' };
  }
}

export async function revokeStaffSessions(staffId: string, reason: string) {
  const session = await requireAdmin();
  const parsedId = StaffIdSchema.safeParse(staffId);
  const parsedReason = z.string().trim().min(5).max(500).safeParse(reason);
  if (!parsedId.success || !parsedReason.success) return { success: false, message: 'Provide a valid account and reason.' };
  try {
    const [staff] = await sql`SELECT id, email, auth_user_id FROM users WHERE id = ${parsedId.data} AND role <> 'admin' LIMIT 1`;
    if (!staff?.auth_user_id) return { success: false, message: 'The staff account was not found.' };
    const { error } = await createAdminClient().auth.admin.signOut(staff.auth_user_id, 'global');
    if (error) throw error;
    await sql`
      INSERT INTO audit_logs (actor_email, actor_role, action, entity_type, entity_id, metadata, reason)
      VALUES (${session.user.email}, 'admin', 'staff_account.sessions_revoked', 'user', ${staff.id}, ${sql.json({ email: staff.email })}, ${parsedReason.data})
    `;
    return { success: true, message: `All sessions for ${staff.email} were revoked.` };
  } catch (error) {
    console.error('Staff session revocation failed:', error);
    return { success: false, message: 'We could not revoke those sessions.' };
  }
}

const DoctorBlockSchema = z.object({
  doctorEmail: z.string().email(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  startTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
  endTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
  reason: z.string().trim().min(2).max(200),
});

export async function createAdminDoctorScheduleBlock(input: z.infer<typeof DoctorBlockSchema>) {
  const session = await auth();
  const parsed = DoctorBlockSchema.safeParse(input);
  if (session?.user.role !== 'admin' || !session.user.email || !parsed.success || parsed.data.startTime >= parsed.data.endTime) {
    return { success: false, message: 'Choose a doctor, valid date and time range, and reason.' };
  }
  try {
    const [doctor] = await sql`SELECT name, email FROM users WHERE email = ${parsed.data.doctorEmail.toLowerCase()} AND role = 'doctor' LIMIT 1`;
    if (!doctor) return { success: false, message: 'The selected doctor account was not found.' };
    const [block] = await sql`
      INSERT INTO doctor_schedule_blocks (doctor_email, doctor_name, block_date, start_time, end_time, reason)
      VALUES (${doctor.email}, ${doctor.name}, ${parsed.data.date}, ${parsed.data.startTime}, ${parsed.data.endTime}, ${parsed.data.reason})
      RETURNING id
    `;
    await sql`
      INSERT INTO audit_logs (actor_email, actor_role, action, entity_type, entity_id, metadata)
      VALUES (${session.user.email}, 'admin', 'doctor_schedule.block_created', 'doctor_schedule_block', ${block.id}, ${sql.json({ ...parsed.data })})
    `;
    revalidatePath('/dashboard/calendar');
    revalidatePath('/dashboard/doctor/availability');
    revalidatePath('/dashboard/user/appointments');
    return { success: true, message: `Unavailable time recorded for ${doctor.name}.` };
  } catch (error) {
    console.error('Admin schedule block failed:', error);
    return { success: false, message: 'We could not save this unavailable time.' };
  }
}

const AvailabilitySchema = z.object({
  doctorId: z.string().trim().min(1).max(100),
  dayOfWeek: z.number().int().min(0).max(6),
  appointmentTime: z.string().regex(/^(0?[1-9]|1[0-2]):[0-5]\d (AM|PM)$/),
});

export async function addDoctorAvailabilitySlot(input: z.infer<typeof AvailabilitySchema>) {
  const session = await auth();
  const parsed = AvailabilitySchema.safeParse(input);
  if (session?.user.role !== 'admin' || !session.user.email || !parsed.success) return { success: false, message: 'Check the doctor and availability details.' };
  try {
    const [doctor] = await sql`SELECT id, name FROM doctors WHERE id = ${parsed.data.doctorId} AND active = TRUE LIMIT 1`;
    if (!doctor) return { success: false, message: 'The selected doctor is not active.' };
    await sql`
      INSERT INTO doctor_availability (doctor_id, day_of_week, appointment_time, active)
      VALUES (${doctor.id}, ${parsed.data.dayOfWeek}, ${parsed.data.appointmentTime}, TRUE)
      ON CONFLICT (doctor_id, day_of_week, appointment_time) DO UPDATE SET active = TRUE
    `;
    await sql`
      INSERT INTO audit_logs (actor_email, actor_role, action, entity_type, entity_id, metadata)
      VALUES (${session.user.email}, 'admin', 'doctor_availability.slot_added', 'doctor_availability', ${doctor.id}, ${sql.json({ doctor: doctor.name, ...parsed.data })})
    `;
    revalidatePath('/dashboard/calendar');
    revalidatePath('/dashboard/doctor/availability');
    revalidatePath('/dashboard/user/appointments');
    return { success: true, message: `Availability added for ${doctor.name}.` };
  } catch (error) {
    console.error('Availability slot creation failed:', error);
    return { success: false, message: 'We could not add this availability slot.' };
  }
}

export async function removeDoctorAvailabilitySlot(input: { doctorId: string; dayOfWeek: number; appointmentTime: string }) {
  const session = await auth();
  const parsed = AvailabilitySchema.safeParse(input);
  if (session?.user.role !== 'admin' || !session.user.email || !parsed.success) return { success: false, message: 'You cannot update this availability.' };
  try {
    const [removed] = await sql`
      UPDATE doctor_availability SET active = FALSE
      WHERE doctor_id = ${parsed.data.doctorId} AND day_of_week = ${parsed.data.dayOfWeek}
        AND appointment_time = ${parsed.data.appointmentTime} AND active = TRUE
      RETURNING doctor_id
    `;
    if (!removed) return { success: false, message: 'Availability slot is already inactive.' };
    await sql`
      INSERT INTO audit_logs (actor_email, actor_role, action, entity_type, entity_id, metadata)
      VALUES (${session.user.email}, 'admin', 'doctor_availability.slot_removed', 'doctor_availability', ${removed.doctor_id}, ${sql.json(parsed.data)})
    `;
    revalidatePath('/dashboard/calendar');
    revalidatePath('/dashboard/doctor/availability');
    return { success: true, message: 'Availability slot removed.' };
  } catch (error) {
    console.error('Availability slot update failed:', error);
    return { success: false, message: 'We could not remove this availability slot.' };
  }
}

const PasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(12).max(128),
  confirmPassword: z.string().min(12).max(128),
}).refine((value) => value.newPassword === value.confirmPassword, {
  path: ['confirmPassword'], message: 'The new passwords do not match.',
});

export async function changeTemporaryPassword(_previous: string | undefined, formData: FormData) {
  const session = await auth();
  const accountEmail = session?.user.email;
  if (!accountEmail || !session?.user.mustChangePassword) return 'This password change is no longer required.';
  const parsed = PasswordSchema.safeParse({
    currentPassword: formData.get('currentPassword'),
    newPassword: formData.get('newPassword'),
    confirmPassword: formData.get('confirmPassword'),
  });
  if (!parsed.success) return parsed.error.issues[0]?.message ?? 'Check the password fields.';
  if (parsed.data.currentPassword === parsed.data.newPassword) return 'Choose a new password different from the temporary password.';
  const supabaseAdmin = createAdminClient();
  let authPasswordUpdated = false;
  try {
    const password = await bcrypt.hash(parsed.data.newPassword, 12);
    const result = await sql.begin(async (transaction) => {
      const [account] = await transaction`SELECT password FROM users WHERE email = ${accountEmail} AND must_change_password = TRUE LIMIT 1 FOR UPDATE`;
      if (!account) return 'already-changed';
      if (!(await bcrypt.compare(parsed.data.currentPassword, account.password))) return 'invalid-current-password';
      const { error: authError } = await supabaseAdmin.auth.admin.updateUserById(session.user.id, {
        password: parsed.data.newPassword,
      });
      if (authError) throw new Error(`Supabase password update failed: ${authError.message}`);
      authPasswordUpdated = true;
      const [updated] = await transaction`UPDATE users SET password = ${password}, must_change_password = FALSE, password_changed_at = NOW(), failed_login_attempts = 0, locked_until = NULL WHERE email = ${accountEmail} AND must_change_password = TRUE RETURNING email`;
      if (!updated) throw new Error('Application password record was not updated.');
      await transaction`
        INSERT INTO audit_logs (actor_email, actor_role, action, entity_type, entity_id, metadata)
        VALUES (${accountEmail}, ${session.user.role ?? 'staff'}, 'staff_account.password_changed', 'user', ${accountEmail}, '{}'::jsonb)
      `;
      return 'changed';
    });
    if (result === 'already-changed') return 'This password change is no longer required.';
    if (result === 'invalid-current-password') return 'The temporary password is incorrect.';
  } catch (error) {
    if (authPasswordUpdated) {
      await supabaseAdmin.auth.admin.updateUserById(session.user.id, {
        password: parsed.data.currentPassword,
      });
    }
    console.error('Temporary password update failed:', error);
    return 'We could not update the password. No password change was saved.';
  }
  await signOut({ redirectTo: '/login?passwordUpdated=1' });
  redirect('/login?passwordUpdated=1');
}
