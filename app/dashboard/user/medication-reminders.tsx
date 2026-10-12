'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { addPatientMedicationReminder, removePatientMedicationReminder } from '@/app/lib/patient-actions';

type Reminder = { id: string; medication: string; time: string; instructions: string };

export default function MedicationReminders({ reminders }: { reminders: Reminder[] }) {
  const [medication, setMedication] = useState('');
  const [time, setTime] = useState('08:00');
  const [instructions, setInstructions] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const router = useRouter();

  async function add(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    const result = await addPatientMedicationReminder({ medicationName: medication, reminderTime: time, instructions });
    setSaving(false);
    setMessage(result.message);
    if (result.success) {
      setMedication('');
      setInstructions('');
      router.refresh();
    }
  }

  async function remove(id: string) {
    const result = await removePatientMedicationReminder(id);
    setMessage(result.message);
    if (result.success) router.refresh();
  }

  return <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
    <div><h2 className="font-semibold text-slate-900">Personal medication reminders</h2><p className="mt-1 text-sm text-slate-500">Add reminders based on your current medication instructions. These are personal notes and do not come from your prescription record.</p></div>
    {reminders.length > 0 ? <ul className="mt-4 divide-y divide-slate-100">{reminders.map((item) => <li key={item.id} className="flex items-start justify-between gap-4 py-3 first:pt-0"><div><p className="font-medium text-slate-900">{item.time} · {item.medication}</p>{item.instructions && <p className="mt-1 text-sm text-slate-600">{item.instructions}</p>}</div><button onClick={() => remove(item.id)} className="text-sm text-slate-500 underline hover:text-rose-700">Remove</button></li>)}</ul> : <p className="mt-4 rounded-xl bg-slate-50 p-3 text-sm text-slate-600">No personal reminders set. Add one below if helpful.</p>}
    <form onSubmit={add} className="mt-4 grid gap-3 border-t border-slate-100 pt-4 sm:grid-cols-2">
      <label className="text-xs font-medium text-slate-700">Medication name<input value={medication} onChange={(event) => setMedication(event.target.value)} maxLength={120} required className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" placeholder="As shown on your label" /></label>
      <label className="text-xs font-medium text-slate-700">Reminder time<input type="time" value={time} onChange={(event) => setTime(event.target.value)} required className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" /></label>
      <label className="text-xs font-medium text-slate-700 sm:col-span-2">Optional note<input value={instructions} onChange={(event) => setInstructions(event.target.value)} maxLength={240} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" placeholder="Personal note (follow your clinician’s instructions)" /></label>
      <div className="sm:col-span-2"><button disabled={saving} className="rounded-lg bg-teal-700 px-3 py-2 text-sm font-medium text-white disabled:opacity-50">{saving ? 'Saving…' : 'Add reminder'}</button>{message && <p role="status" className="mt-2 text-sm text-slate-600">{message}</p>}</div>
    </form>
    <p className="mt-3 text-xs text-slate-500">These reminders are shown when you open this dashboard; they do not send alarms or change prescriptions. Follow your prescription label and contact your care team about medication changes.</p>
  </section>;
}
