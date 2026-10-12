'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { savePatientTriage } from '@/app/lib/nurse-actions';
import { updateAppointmentCheckIn } from '@/app/lib/doctor-actions';

type TriageValues = { appointmentId: string; patientEmail: string; bloodPressure: string; pulse: string; temperatureC: string; weightKg: string; heightCm: string; initialComplaint: string; status: string };

export function NurseCheckInControl({ appointmentId, initialStatus }: { appointmentId: string; initialStatus: string }) {
  const [status, setStatus] = useState(initialStatus); const [message, setMessage] = useState(''); const [busy, setBusy] = useState(false); const router = useRouter();
  async function change(nextStatus: string) {
    setBusy(true); const result = await updateAppointmentCheckIn(appointmentId, nextStatus); setBusy(false); setMessage(result.message);
    if (result.success) { setStatus(nextStatus); router.refresh(); }
  }
  return <div className="flex flex-col gap-2 sm:flex-row sm:items-center"><label className="sr-only" htmlFor={`checkin-${appointmentId}`}>Patient check-in status</label><select id={`checkin-${appointmentId}`} value={status} disabled={busy || status === 'In consultation'} onChange={(event) => change(event.target.value)} className="min-h-11 w-full rounded-lg border border-slate-300 px-3 text-sm sm:w-auto"><option>Not checked in</option><option>Checked in</option>{status === 'In consultation' && <option>In consultation</option>}</select>{message && <span className="text-xs text-slate-500" role="status">{message}</span>}</div>;
}

export function NurseTriageForm({ initial }: { initial: TriageValues }) {
  const [values, setValues] = useState(initial); const [message, setMessage] = useState(''); const [busy, setBusy] = useState(false); const router = useRouter();
  function field<K extends keyof TriageValues>(key: K, value: TriageValues[K]) { setValues((current) => ({ ...current, [key]: value })); }
  async function save(submit: boolean) {
    setBusy(true);
    const result = await savePatientTriage({
      appointmentId: values.appointmentId, bloodPressure: values.bloodPressure,
      pulse: values.pulse ? Number(values.pulse) : null, temperatureC: values.temperatureC ? Number(values.temperatureC) : null,
      weightKg: values.weightKg ? Number(values.weightKg) : null, heightCm: values.heightCm ? Number(values.heightCm) : null,
      initialComplaint: values.initialComplaint, submit,
    });
    setBusy(false); setMessage(result.message); if (result.success) router.refresh();
  }
  const disabled = busy || values.status === 'Locked';
  return <form onSubmit={(event) => { event.preventDefault(); void save(false); }} className="space-y-3 border-t border-slate-100 pt-4">
    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Triage intake · {values.status || 'Not started'}</p>
    <label className="block text-sm font-medium text-slate-700">Initial complaint<textarea required minLength={3} maxLength={2000} rows={3} disabled={disabled} value={values.initialComplaint} onChange={(event) => field('initialComplaint', event.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm disabled:bg-slate-50" placeholder="Patient’s reason for visit and initial observations" /></label>
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3"><label className="text-xs font-medium text-slate-600">Blood pressure<input disabled={disabled} value={values.bloodPressure} onChange={(event) => field('bloodPressure', event.target.value)} placeholder="120/80" className="mt-1 min-h-10 w-full rounded-lg border border-slate-300 px-2 text-sm disabled:bg-slate-50" /></label><label className="text-xs font-medium text-slate-600">Pulse (bpm)<input type="number" min="20" max="300" disabled={disabled} value={values.pulse} onChange={(event) => field('pulse', event.target.value)} className="mt-1 min-h-10 w-full rounded-lg border border-slate-300 px-2 text-sm disabled:bg-slate-50" /></label><label className="text-xs font-medium text-slate-600">Temperature (°C)<input type="number" min="25" max="45" step="0.1" disabled={disabled} value={values.temperatureC} onChange={(event) => field('temperatureC', event.target.value)} className="mt-1 min-h-10 w-full rounded-lg border border-slate-300 px-2 text-sm disabled:bg-slate-50" /></label><label className="text-xs font-medium text-slate-600">Weight (kg)<input type="number" min="0.2" max="500" step="0.1" disabled={disabled} value={values.weightKg} onChange={(event) => field('weightKg', event.target.value)} className="mt-1 min-h-10 w-full rounded-lg border border-slate-300 px-2 text-sm disabled:bg-slate-50" /></label><label className="text-xs font-medium text-slate-600">Height (cm)<input type="number" min="10" max="300" step="0.1" disabled={disabled} value={values.heightCm} onChange={(event) => field('heightCm', event.target.value)} className="mt-1 min-h-10 w-full rounded-lg border border-slate-300 px-2 text-sm disabled:bg-slate-50" /></label></div>
    {values.status !== 'Locked' && <div className="flex flex-col gap-2 min-[420px]:flex-row"><button type="submit" disabled={disabled} className="min-h-11 rounded-lg border border-slate-300 px-4 text-sm font-medium text-slate-700 disabled:opacity-50">Save draft</button><button type="button" disabled={disabled} onClick={() => save(true)} className="min-h-11 rounded-lg bg-teal-700 px-4 text-sm font-semibold text-white disabled:opacity-50">Submit to care team</button></div>}
    {message && <p className="text-sm text-slate-600" role="status">{message}</p>}
  </form>;
}
