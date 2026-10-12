'use server';

import { auth, signOut } from '@/auth';
import bcrypt from 'bcryptjs';
import postgres from 'postgres';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';

const sql = postgres(process.env.POSTGRES_URL!, { ssl: 'require' });
const StaffSchema = z.object({
  name: z.string().trim().min(2).max(255),
  email: z.string().trim().email().max(320),
  temporaryPassword: z.string().min(12).max(128),
  role: z.enum(['doctor', 'nurse', 'pharmacist', 'pharmacy_reception', 'pharmacy_stocker']),
});

export async function createStaffAccount(input: z.infer<typeof StaffSchema>) {
  const session = await auth();
  const actorEmail = session?.user.email;
  const parsed = StaffSchema.safeParse(input);
  if (session?.user.role !== 'admin' || !actorEmail || !parsed.success) {
    return { success: false, message: 'Enter valid staff details. Admin access is required.' };
  }
  try {
    const password = await bcrypt.hash(parsed.data.temporaryPassword, 12);
    const created = await sql.begin(async (transaction) => {
      const [account] = await transaction`
        INSERT INTO users (name, email, password, role, must_change_password)
        VALUES (${parsed.data.name}, ${parsed.data.email.toLowerCase()}, ${password}, ${parsed.data.role}, TRUE)
        RETURNING id, email, role
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
    if (typeof error === 'object' && error !== null && 'code' in error && error.code === '23505') {
      return { success: false, message: 'An account already uses that email address.' };
    }
    console.error('Staff account creation failed:', error);
    return { success: false, message: 'We could not create this staff account.' };
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
  try {
    const password = await bcrypt.hash(parsed.data.newPassword, 12);
    const changed = await sql.begin(async (transaction) => {
      const [account] = await transaction`SELECT password FROM users WHERE email = ${accountEmail} AND must_change_password = TRUE LIMIT 1 FOR UPDATE`;
      if (!account || !(await bcrypt.compare(parsed.data.currentPassword, account.password))) return false;
      const [updated] = await transaction`UPDATE users SET password = ${password}, must_change_password = FALSE WHERE email = ${accountEmail} AND must_change_password = TRUE RETURNING email`;
      if (!updated) return false;
      await transaction`
        INSERT INTO audit_logs (actor_email, actor_role, action, entity_type, entity_id, metadata)
        VALUES (${accountEmail}, ${session.user.role ?? 'staff'}, 'staff_account.password_changed', 'user', ${accountEmail}, '{}'::jsonb)
      `;
      return true;
    });
    if (!changed) return 'The temporary password is incorrect or has already been changed.';
  } catch (error) {
    console.error('Temporary password update failed:', error);
    return 'We could not update the password. Please try again.';
  }
  await signOut({ redirectTo: '/login?passwordUpdated=1' });
  redirect('/login?passwordUpdated=1');
}
