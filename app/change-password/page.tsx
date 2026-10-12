import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import ChangePasswordForm from './change-password-form';

export default async function ChangePasswordPage() {
  const session = await auth();
  if (!session?.user) redirect('/login');
  if (!session.user.mustChangePassword) redirect('/dashboard');
  return <main className="flex min-h-screen items-center justify-center bg-slate-50 p-4"><section className="w-full max-w-lg space-y-4"><p className="text-sm font-semibold uppercase tracking-wide text-teal-700">Account security</p><h1 className="text-2xl font-bold text-slate-950">Set your password</h1><p className="text-sm leading-6 text-slate-600">Your administrator created a temporary password. Choose a new password to finish setting up your account.</p><ChangePasswordForm /></section></main>;
}
