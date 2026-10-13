import postgres from 'postgres';
import { redirect } from 'next/navigation';
import { isUserRole, type UserRole } from '@/app/lib/definitions';
import { createClient } from '@/app/lib/supabase/server';

const sql = postgres(process.env.POSTGRES_URL!, { ssl: 'require' });

export type AppUser = {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  mustChangePassword: boolean;
};

export type AppSession = { user: AppUser };

export async function auth(): Promise<AppSession | null> {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user?.email) return null;

  const [profile] = await sql<{
    id: string;
    name: string;
    email: string;
    role: string;
    must_change_password: boolean;
  }[]>`
    SELECT id, name, email, role, must_change_password
    FROM users
    WHERE auth_user_id = ${user.id}
       OR (auth_user_id IS NULL AND lower(email) = lower(${user.email}))
    LIMIT 1
  `;

  if (!profile || !isUserRole(profile.role)) return null;

  await sql`
    UPDATE users
    SET auth_user_id = ${user.id}
    WHERE id = ${profile.id} AND auth_user_id IS NULL
  `;

  return {
    user: {
      id: user.id,
      name: profile.name,
      email: profile.email,
      role: profile.role,
      mustChangePassword: profile.must_change_password === true,
    },
  };
}

export async function signOut({ redirectTo = '/' }: { redirectTo?: string } = {}) {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect(redirectTo);
}
