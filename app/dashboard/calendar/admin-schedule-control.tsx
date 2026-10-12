'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createAdminDoctorScheduleBlock } from '@/app/lib/admin-actions';

type Doctor = { name: string; email: string };
export default function AdminScheduleControl({ doctors }: { doctors: Doctor[] }) {
  const router = useRouter();
  const [doctorEmail, setDoctorEmail] = useState(doctors[0]?.email ?? '');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); const formElement = event.currentTarget; const data = new FormData(formElement);
    setBusy(true);
    const result = await createAdminDoctorScheduleBlock({ doctorEmail, date: String(data.get('date')), startTime: String(data.get('startTime')), endTime: String(data.get('endTime')), reason: String(data.get('reason')) });
    setBusy(false); setMessage(result.message);
    if (result.success) { formElement.reset(); router.refresh(); }
  }
  return <form onSubmit={submit} className="grid gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:grid-cols-2 sm:p-5">
    <div className="sm:col-span-2"><h2 className="font-semibold text-slate-900">Block a doctor’s schedule</h2><p className="mt-1 text-sm text-slate-500">Record leave, surgery, or other unavailable clinic time.</p></div>
    <label className="text-sm font-medium text-slate-700 sm:col-span-2">Doctor<select required value={doctorEmail} onChange={(event) => setDoctorEmail(event.target.value)} className="mt-1 min-h-11 w-full rounded-lg border border-slate-300 bg-white px-3"><option value="">Select doctor</option>{doctors.map((doctor) => <option key={doctor.email} value={doctor.email}>{doctor.name} · {doctor.email}</option>)}</select></label>
    <label className="text-sm font-medium text-slate-700">Date<input required name="date" type="date" min={new Date().toISOString().slice(0, 10)} className="mt-1 min-h-11 w-full rounded-lg border border-slate-300 px-3" /></label>
    <div className="grid grid-cols-2 gap-3"><label className="text-sm font-medium text-slate-700">From<input required name="startTime" type="time" className="mt-1 min-h-11 w-full rounded-lg border border-slate-300 px-2" /></label><label className="text-sm font-medium text-slate-700">To<input required name="endTime" type="time" className="mt-1 min-h-11 w-full rounded-lg border border-slate-300 px-2" /></label></div>
    <label className="text-sm font-medium text-slate-700 sm:col-span-2">Reason<input required minLength={2} maxLength={200} name="reason" placeholder="Leave, surgery, emergency…" className="mt-1 min-h-11 w-full rounded-lg border border-slate-300 px-3" /></label>
    <div className="sm:col-span-2"><button disabled={busy || !doctors.length} className="min-h-11 w-full rounded-lg bg-teal-700 px-4 text-sm font-semibold text-white disabled:opacity-50 sm:w-auto">{busy ? 'Saving…' : 'Save schedule block'}</button>{message && <p role="status" className="mt-2 text-sm text-slate-600">{message}</p>}</div>
  </form>;
}
