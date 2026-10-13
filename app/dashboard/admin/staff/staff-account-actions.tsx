'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { resetStaffPassword, revokeStaffSessions, setStaffAccountActive } from '@/app/lib/admin-actions';

type Props = { staffId: string; email: string; active: boolean };
type Action = 'reset' | 'revoke' | 'status' | null;

export default function StaffAccountActions({ staffId, email, active }: Props) {
  const [action, setAction] = useState<Action>(null);
  const [password, setPassword] = useState('');
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const router = useRouter();

  function close() {
    if (busy) return;
    setAction(null);
    setPassword('');
    setReason('');
  }

  async function submit() {
    if (!reason.trim() || (action === 'reset' && password.length < 12)) return;
    setBusy(true);
    const result = action === 'reset'
      ? await resetStaffPassword({ staffId, temporaryPassword: password, reason })
      : action === 'revoke'
        ? await revokeStaffSessions(staffId, reason)
        : await setStaffAccountActive(staffId, !active, reason);
    setBusy(false);
    setMessage(result.message);
    if (result.success) {
      close();
      router.refresh();
    }
  }

  const title = action === 'reset' ? 'Reset temporary password' : action === 'revoke' ? 'Revoke all sessions' : `${active ? 'Disable' : 'Enable'} account`;

  return <div className="mt-4 space-y-2 border-t border-slate-100 pt-3">
    <span className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${active ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'}`}>
      {active ? 'Active' : 'Disabled'}
    </span>
    <div className="flex flex-wrap gap-2">
      <button type="button" disabled={busy} onClick={() => setAction('reset')} className="rounded-lg border border-slate-300 px-2.5 py-1.5 text-xs font-medium text-slate-700 transition hover:border-teal-400 hover:text-teal-700 disabled:opacity-50">Reset password</button>
      <button type="button" disabled={busy} onClick={() => setAction('revoke')} className="rounded-lg border border-slate-300 px-2.5 py-1.5 text-xs font-medium text-slate-700 transition hover:border-teal-400 hover:text-teal-700 disabled:opacity-50">Revoke sessions</button>
      <button type="button" disabled={busy} onClick={() => setAction('status')} className="rounded-lg border border-slate-300 px-2.5 py-1.5 text-xs font-medium text-slate-700 transition hover:border-teal-400 hover:text-teal-700 disabled:opacity-50">{active ? 'Disable' : 'Enable'}</button>
    </div>
    {message && <p className="text-xs text-slate-600" role="status">{message}</p>}
    {action && <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && close()}>
      <section role="dialog" aria-modal="true" aria-labelledby="staff-action-title" className="w-full max-w-md rounded-2xl bg-white p-5 shadow-2xl">
        <p className="text-xs font-semibold uppercase tracking-wide text-teal-700">Staff account</p>
        <h2 id="staff-action-title" className="mt-1 text-lg font-bold text-slate-900">{title}</h2>
        <p className="mt-1 text-sm text-slate-500">{email}</p>
        {action === 'reset' && <label className="mt-5 block text-sm font-medium text-slate-700">New temporary password<input autoFocus type="password" minLength={12} value={password} onChange={(event) => setPassword(event.target.value)} className="mt-1 min-h-11 w-full rounded-xl border border-slate-300 px-3 outline-none focus:border-teal-700 focus:ring-2 focus:ring-teal-100" /><span className="mt-1 block text-xs font-normal text-slate-500">Use at least 12 characters and share it securely.</span></label>}
        <label className="mt-4 block text-sm font-medium text-slate-700">Reason<textarea required minLength={5} value={reason} onChange={(event) => setReason(event.target.value)} rows={3} className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 outline-none focus:border-teal-700 focus:ring-2 focus:ring-teal-100" placeholder="Record why this action is needed" /></label>
        <div className="mt-5 flex justify-end gap-2"><button type="button" disabled={busy} onClick={close} className="rounded-xl px-4 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-100">Cancel</button><button type="button" disabled={busy || reason.trim().length < 5 || (action === 'reset' && password.length < 12)} onClick={() => void submit()} className="rounded-xl bg-teal-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-teal-800 disabled:opacity-50">{busy ? 'Saving...' : 'Confirm'}</button></div>
      </section>
    </div>}
  </div>;
}
