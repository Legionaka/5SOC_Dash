import { auth, type AppSession } from '@/auth';
import { redirect } from 'next/navigation';

export async function requireUser(): Promise<AppSession> {
  const session = await auth();
  if (!session) redirect('/login');
  return session;
}

export async function requireRole(...roles: AppSession['user']['role'][]): Promise<AppSession> {
  const session = await requireUser();
  if (!roles.includes(session.user.role)) redirect('/unauthorized');
  return session;
}

export async function requireAdmin() {
  return requireRole('admin');
}

export function canManageStaff(session: AppSession) {
  return session.user.role === 'admin';
}
