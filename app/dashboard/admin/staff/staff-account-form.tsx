'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createStaffAccount } from '@/app/lib/admin-actions';

const staffRoles = [
  ['doctor', 'Doctor'], ['nurse', 'Nurse'], ['pharmacist', 'Pharmacist'],
  ['pharmacy_reception', 'Reception'], ['pharmacy_stocker', 'Stocker'],
] as const;

export default function StaffAccountForm() {
  const [name, setName] = useState(''); const [email, setEmail] = useState('');
  const [password, setPassword] = useState(''); const [role, setRole] = useState<(typeof staffRoles)[number][0]>('doctor');
  const [message, setMessage] = useState<string | null>(null); const [busy, setBusy] = useState(false); const router = useRouter();
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true);
    const result = await createStaffAccount({ name, email, temporaryPassword: password, role });
    setBusy(false); setMessage(result.message);
    if (result.success) { setName(''); setEmail(''); setPassword(''); router.refresh(); }
  }
  return <form onSubmit={submit} className="grid gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:grid-cols-2 sm:p-5">
    <div className="sm:col-span-2"><h2 className="font-semibold text-slate-900">Add a staff account</h2><p className="mt-1 text-sm text-slate-500">The staff member must replace this temporary password at first sign-in. Share it with them securely.</p></div>
    <label className="text-sm font-medium text-slate-700">Full name<input required minLength={2} maxLength={255} autoComplete="name" value={name} onChange={(event) => setName(event.target.value)} className="mt-1 min-h-11 w-full rounded-lg border border-slate-300 px-3" /></label>
    <label className="text-sm font-medium text-slate-700">Work email<input required type="email" maxLength={320} autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} className="mt-1 min-h-11 w-full rounded-lg border border-slate-300 px-3" /></label>
    <label className="text-sm font-medium text-slate-700">Role<select value={role} onChange={(event) => setRole(event.target.value as typeof role)} className="mt-1 min-h-11 w-full rounded-lg border border-slate-300 bg-white px-3">{staffRoles.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
    <label className="text-sm font-medium text-slate-700">Temporary password<input required type="password" minLength={12} maxLength={128} autoComplete="new-password" value={password} onChange={(event) => setPassword(event.target.value)} className="mt-1 min-h-11 w-full rounded-lg border border-slate-300 px-3" /><span className="mt-1 block text-xs font-normal text-slate-500">At least 12 characters. This value is not emailed by the app.</span></label>
    <div className="sm:col-span-2"><button disabled={busy} className="min-h-11 w-full rounded-lg bg-teal-700 px-4 text-sm font-semibold text-white disabled:opacity-50 sm:w-auto">{busy ? 'Creating account...' : 'Create staff account'}</button>{message && <p className="mt-3 break-words text-sm text-slate-700" role="status">{message}</p>}</div>
  </form>;
}
