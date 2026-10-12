'use client';

import { useActionState } from 'react';
import { changeTemporaryPassword } from '@/app/lib/admin-actions';

export default function ChangePasswordForm() {
  const [message, formAction, busy] = useActionState(changeTemporaryPassword, undefined);
  return <form action={formAction} className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
    <label className="block text-sm font-medium text-slate-700">Temporary password<input required type="password" name="currentPassword" autoComplete="current-password" className="mt-1 min-h-11 w-full rounded-lg border border-slate-300 px-3" /></label>
    <label className="block text-sm font-medium text-slate-700">New password<input required type="password" name="newPassword" minLength={12} maxLength={128} autoComplete="new-password" className="mt-1 min-h-11 w-full rounded-lg border border-slate-300 px-3" /><span className="mt-1 block text-xs font-normal text-slate-500">Use at least 12 characters.</span></label>
    <label className="block text-sm font-medium text-slate-700">Confirm new password<input required type="password" name="confirmPassword" minLength={12} maxLength={128} autoComplete="new-password" className="mt-1 min-h-11 w-full rounded-lg border border-slate-300 px-3" /></label>
    {message && <p className="text-sm text-rose-700" role="alert">{message}</p>}
    <button disabled={busy} className="min-h-11 w-full rounded-lg bg-teal-700 px-4 text-sm font-semibold text-white disabled:opacity-50">{busy ? 'Updating password...' : 'Set new password'}</button>
  </form>;
}
