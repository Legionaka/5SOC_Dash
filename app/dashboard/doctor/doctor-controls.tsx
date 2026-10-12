'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  addPatientClinicalItem,
  cancelScheduleBlock,
  createClinicalNote,
  createDiagnosticResult,
  createPrescription,
  createClinicalReferral,
  createScheduleBlock,
  resolvePatientClinicalItem,
  reviewDiagnosticResult,
  signClinicalNote,
  updateAppointmentCheckIn,
  updatePrescriptionStatus,
  updateClinicalReferral,
} from '@/app/lib/doctor-actions';

type AppointmentOption = { id: string; patientEmail: string; patientName: string; date: string; reason: string };

function Feedback({ value }: { value: string | null }) {
  return value ? <p className="mt-3 break-words text-sm text-slate-600" role="status">{value}</p> : null;
}

export function CheckInControl({ appointmentId, value }: { appointmentId: string; value: string }) {
  const [status, setStatus] = useState(value);
  const [message, setMessage] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const router = useRouter();
  const update = async (next: string) => {
    setSaving(true);
    const result = await updateAppointmentCheckIn(appointmentId, next);
    setSaving(false);
    setMessage(result.message);
    if (result.success) { setStatus(next); router.refresh(); }
  };
  return <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-center">
    <select aria-label="Appointment check-in status" value={status} onChange={(event) => update(event.target.value)} disabled={saving} className="min-h-11 w-full rounded-lg border border-slate-300 px-3 text-sm sm:w-auto">
      <option>Not checked in</option><option>Checked in</option><option>In consultation</option><option>Complete</option>
    </select>
    {message && <span className="text-xs text-slate-500" role="status">{message}</span>}
  </div>;
}

export function ClinicalNoteForm({ appointments }: { appointments: AppointmentOption[] }) {
  const [appointmentId, setAppointmentId] = useState(appointments[0]?.id ?? '');
  const [title, setTitle] = useState('Consultation note');
  const [content, setContent] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const router = useRouter();
  async function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setSaving(true);
    const result = await createClinicalNote({ appointmentId, title, content });
    setSaving(false); setMessage(result.message);
    if (result.success) { setContent(''); router.refresh(); }
  }
  return <form onSubmit={save} className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
    <h2 className="font-semibold text-slate-900">Start a clinical note</h2>
    {appointments.length === 0 ? <p className="text-sm text-slate-500">A note must be linked to an appointment. No appointments are available to select.</p> : <>
      <label className="block text-sm font-medium text-slate-700">Appointment<select required value={appointmentId} onChange={(event) => setAppointmentId(event.target.value)} className="mt-1 min-h-11 w-full rounded-lg border border-slate-300 px-3 py-2"><option value="" disabled>Select a visit</option>{appointments.map((item) => <option key={item.id} value={item.id}>{item.date} · {item.patientName} · {item.reason.slice(0, 50)}</option>)}</select></label>
      <label className="block text-sm font-medium text-slate-700">Title<input required maxLength={160} value={title} onChange={(event) => setTitle(event.target.value)} className="mt-1 min-h-11 w-full rounded-lg border border-slate-300 px-3 py-2" /></label>
      <label className="block text-sm font-medium text-slate-700">Note<textarea required minLength={5} maxLength={12000} rows={6} value={content} onChange={(event) => setContent(event.target.value)} className="mt-1 w-full resize-y rounded-lg border border-slate-300 px-3 py-2" placeholder="Document the encounter..." /></label>
      <button disabled={saving || !appointmentId} className="min-h-11 w-full rounded-lg bg-teal-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50 sm:w-auto">{saving ? 'Saving...' : 'Save draft'}</button>
    </>}
    <Feedback value={message} />
  </form>;
}

export function PrescriptionForm({ appointments }: { appointments: AppointmentOption[] }) {
  const [appointmentId, setAppointmentId] = useState(''); const [patientEmail, setPatientEmail] = useState('');
  const [medication, setMedication] = useState(''); const [strength, setStrength] = useState('');
  const [directions, setDirections] = useState(''); const [quantity, setQuantity] = useState('');
  const [refills, setRefills] = useState('0'); const [pharmacy, setPharmacy] = useState('');
  const [message, setMessage] = useState<string | null>(null); const [saving, setSaving] = useState(false); const router = useRouter();
  async function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setSaving(true);
    const result = await createPrescription({ patientEmail, appointmentId: appointmentId || undefined, medication, strength, directions, quantity: Number(quantity), refills: Number(refills), pharmacy });
    setSaving(false); setMessage(result.message);
    if (result.success) { setMedication(''); setStrength(''); setDirections(''); setQuantity(''); setRefills('0'); setPharmacy(''); router.refresh(); }
  }
  return <form onSubmit={save} className="grid gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:grid-cols-2 sm:p-5">
    <h2 className="font-semibold text-slate-900 sm:col-span-2">Create e-prescription</h2>
    <label className="text-sm font-medium text-slate-700 sm:col-span-2">Link visit (optional)<select value={appointmentId} onChange={(e) => { setAppointmentId(e.target.value); setPatientEmail(appointments.find((item) => item.id === e.target.value)?.patientEmail ?? ''); }} className="mt-1 min-h-11 w-full rounded-lg border border-slate-300 px-3"><option value="">Choose visit</option>{appointments.map((item) => <option key={item.id} value={item.id}>{item.date} · {item.patientName}</option>)}</select></label>
    <label className="text-sm font-medium text-slate-700 sm:col-span-2">Patient email<input required type="email" value={patientEmail} onChange={(e) => { setPatientEmail(e.target.value); setAppointmentId(''); }} className="mt-1 min-h-11 w-full rounded-lg border border-slate-300 px-3" /></label>
    <label className="text-sm font-medium text-slate-700">Medication<input required value={medication} maxLength={160} onChange={(e) => setMedication(e.target.value)} className="mt-1 min-h-11 w-full rounded-lg border border-slate-300 px-3" /></label>
    <label className="text-sm font-medium text-slate-700">Strength<input required value={strength} maxLength={80} onChange={(e) => setStrength(e.target.value)} placeholder="e.g. 10 mg" className="mt-1 min-h-11 w-full rounded-lg border border-slate-300 px-3" /></label>
    <label className="text-sm font-medium text-slate-700 sm:col-span-2">Directions<input required value={directions} maxLength={1000} onChange={(e) => setDirections(e.target.value)} placeholder="Dose, route, frequency, duration" className="mt-1 min-h-11 w-full rounded-lg border border-slate-300 px-3" /></label>
    <label className="text-sm font-medium text-slate-700">Quantity<input type="number" min="1" max="10000" required value={quantity} onChange={(e) => setQuantity(e.target.value)} className="mt-1 min-h-11 w-full rounded-lg border border-slate-300 px-3" /></label>
    <label className="text-sm font-medium text-slate-700">Refills<input type="number" min="0" max="12" required value={refills} onChange={(e) => setRefills(e.target.value)} className="mt-1 min-h-11 w-full rounded-lg border border-slate-300 px-3" /></label>
    <label className="text-sm font-medium text-slate-700 sm:col-span-2">Preferred pharmacy<input value={pharmacy} maxLength={200} onChange={(e) => setPharmacy(e.target.value)} className="mt-1 min-h-11 w-full rounded-lg border border-slate-300 px-3" /></label>
    <div className="sm:col-span-2"><button disabled={saving} className="min-h-11 w-full rounded-lg bg-teal-700 px-4 text-sm font-semibold text-white disabled:opacity-50 sm:w-auto">{saving ? 'Sending...' : 'Send for pharmacy verification'}</button><Feedback value={message} /></div>
  </form>;
}

export function PrescriptionStatusButton({ id, status, allowVoid = false }: { id: string; status: string; allowVoid?: boolean }) {
  const router = useRouter(); const [note, setNote] = useState(''); const [message, setMessage] = useState<string | null>(null); const [busy, setBusy] = useState(false);
  const next = status === 'Pending verification' ? 'Verified' : status === 'Verified' ? 'Dispensing' : 'Dispensed';
  async function update(value: string) { setBusy(true); const result = await updatePrescriptionStatus(id, value, note); setBusy(false); setMessage(result.message); if (result.success) router.refresh(); }
  return <div className="flex flex-col gap-2 sm:flex-row sm:items-center"><input value={note} onChange={(e) => setNote(e.target.value)} maxLength={1000} placeholder="Pharmacy verification note (optional)" className="min-h-11 min-w-0 rounded-lg border border-slate-300 px-3 text-sm" /><button onClick={() => update(next)} disabled={busy} className="min-h-11 rounded-lg bg-teal-700 px-3 text-sm font-medium text-white disabled:opacity-50">{busy ? 'Updating...' : next}</button>{allowVoid && <button onClick={() => update('Voided')} disabled={busy} className="min-h-11 rounded-lg border border-rose-200 px-3 text-sm font-medium text-rose-700 disabled:opacity-50">Void</button>}<Feedback value={message} /></div>;
}

export function ReferralForm({ appointments }: { appointments: AppointmentOption[] }) {
  const [appointmentId, setAppointmentId] = useState(''); const [patientEmail, setPatientEmail] = useState(''); const [specialty, setSpecialty] = useState(''); const [destination, setDestination] = useState(''); const [reason, setReason] = useState(''); const [urgency, setUrgency] = useState<'routine' | 'urgent'>('routine'); const [message, setMessage] = useState<string | null>(null); const [saving, setSaving] = useState(false); const router = useRouter();
  async function save(event: React.FormEvent<HTMLFormElement>) { event.preventDefault(); setSaving(true); const result = await createClinicalReferral({ patientEmail, appointmentId: appointmentId || undefined, specialty, destination, reason, urgency }); setSaving(false); setMessage(result.message); if (result.success) { setSpecialty(''); setDestination(''); setReason(''); setUrgency('routine'); router.refresh(); } }
  return <form onSubmit={save} className="grid gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:grid-cols-2 sm:p-5"><h2 className="font-semibold text-slate-900 sm:col-span-2">Create specialist referral</h2>
    <label className="text-sm font-medium text-slate-700 sm:col-span-2">Link visit (optional)<select value={appointmentId} onChange={(e) => { setAppointmentId(e.target.value); setPatientEmail(appointments.find((item) => item.id === e.target.value)?.patientEmail ?? ''); }} className="mt-1 min-h-11 w-full rounded-lg border border-slate-300 px-3"><option value="">Choose visit</option>{appointments.map((item) => <option key={item.id} value={item.id}>{item.date} · {item.patientName}</option>)}</select></label>
    <label className="text-sm font-medium text-slate-700 sm:col-span-2">Patient email<input required type="email" value={patientEmail} onChange={(e) => { setPatientEmail(e.target.value); setAppointmentId(''); }} className="mt-1 min-h-11 w-full rounded-lg border border-slate-300 px-3" /></label>
    <label className="text-sm font-medium text-slate-700">Specialty<input required value={specialty} maxLength={120} onChange={(e) => setSpecialty(e.target.value)} className="mt-1 min-h-11 w-full rounded-lg border border-slate-300 px-3" /></label>
    <label className="text-sm font-medium text-slate-700">Destination/provider<input value={destination} maxLength={200} onChange={(e) => setDestination(e.target.value)} className="mt-1 min-h-11 w-full rounded-lg border border-slate-300 px-3" /></label>
    <label className="text-sm font-medium text-slate-700">Urgency<select value={urgency} onChange={(e) => setUrgency(e.target.value as typeof urgency)} className="mt-1 min-h-11 w-full rounded-lg border border-slate-300 px-3"><option value="routine">Routine</option><option value="urgent">Urgent</option></select></label>
    <label className="text-sm font-medium text-slate-700 sm:col-span-2">Clinical reason<textarea required minLength={5} maxLength={3000} rows={4} value={reason} onChange={(e) => setReason(e.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2" /></label>
    <div className="sm:col-span-2"><button disabled={saving} className="min-h-11 w-full rounded-lg bg-teal-700 px-4 text-sm font-semibold text-white disabled:opacity-50 sm:w-auto">{saving ? 'Saving...' : 'Submit referral'}</button><Feedback value={message} /></div>
  </form>;
}

export function ReferralStatusButton({ id, status, next }: { id: string; status: string; next: 'Approved' | 'Sent' | 'Completed' | 'Cancelled' }) {
  const router = useRouter(); const [busy, setBusy] = useState(false); const [message, setMessage] = useState<string | null>(null);
  async function update() { setBusy(true); const result = await updateClinicalReferral(id, next); setBusy(false); setMessage(result.message); if (result.success) router.refresh(); }
  return <div><button onClick={update} disabled={busy} className="min-h-11 rounded-lg border border-teal-200 px-3 text-sm font-medium text-teal-800 disabled:opacity-50">{busy ? 'Updating...' : next}</button><Feedback value={message} /></div>;
}

export function SignNoteButton({ noteId }: { noteId: string }) {
  const [message, setMessage] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const router = useRouter();
  async function sign() {
    if (!window.confirm('Sign and lock this note? Further changes must be recorded as an addendum.')) return;
    setSaving(true); const result = await signClinicalNote(noteId); setSaving(false); setMessage(result.message);
    if (result.success) router.refresh();
  }
  return <div><button onClick={sign} disabled={saving} className="min-h-11 rounded-lg bg-teal-700 px-4 text-sm font-medium text-white disabled:opacity-50">{saving ? 'Signing...' : 'Sign and lock'}</button><Feedback value={message} /></div>;
}

export function AddendumForm({ appointmentId, signedNoteId }: { appointmentId: string; signedNoteId: string }) {
  const [open, setOpen] = useState(false);
  const [content, setContent] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const router = useRouter();
  async function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setSaving(true);
    const result = await createClinicalNote({ appointmentId, title: 'Clinical note addendum', content, addendumTo: signedNoteId });
    setSaving(false); setMessage(result.message);
    if (result.success) { setContent(''); setOpen(false); router.refresh(); }
  }
  return <div className="mt-3">
    <button onClick={() => setOpen((value) => !value)} className="min-h-11 text-sm font-medium text-teal-800 underline">{open ? 'Close addendum form' : 'Addendum'}</button>
    {open && <form onSubmit={save} className="mt-2 space-y-3 rounded-xl border border-amber-200 bg-amber-50 p-3"><p className="text-xs text-amber-900">This creates a separate note linked to the signed record. It does not alter the signed note.</p><textarea required minLength={5} maxLength={12000} rows={4} value={content} onChange={(event) => setContent(event.target.value)} className="w-full resize-y rounded-lg border border-amber-300 bg-white px-3 py-2 text-sm" placeholder="Add the additional clinical information..." /><button disabled={saving} className="min-h-11 rounded-lg bg-teal-700 px-4 text-sm font-medium text-white disabled:opacity-50">{saving ? 'Saving...' : 'Save addendum'}</button><Feedback value={message} /></form>}
  </div>;
}

export function DiagnosticResultForm({ appointments }: { appointments: AppointmentOption[] }) {
  const [appointmentId, setAppointmentId] = useState('');
  const [patientEmail, setPatientEmail] = useState('');
  const [testName, setTestName] = useState('');
  const [summary, setSummary] = useState('');
  const [priority, setPriority] = useState<'routine' | 'critical'>('routine');
  const [message, setMessage] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const router = useRouter();
  async function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setSaving(true);
    const result = await createDiagnosticResult({ appointmentId: appointmentId || undefined, patientEmail, testName, summary, priority });
    setSaving(false); setMessage(result.message);
    if (result.success) { setTestName(''); setSummary(''); router.refresh(); }
  }
  function chooseAppointment(id: string) {
    setAppointmentId(id);
    const appointment = appointments.find((item) => item.id === id);
    if (appointment) setPatientEmail(appointment.patientEmail);
  }
  return <form onSubmit={save} className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
    <h2 className="font-semibold text-slate-900">Add a diagnostic result</h2>
    <label className="block text-sm font-medium text-slate-700">Link appointment (optional)<select value={appointmentId} onChange={(event) => chooseAppointment(event.target.value)} className="mt-1 min-h-11 w-full rounded-lg border border-slate-300 px-3 py-2"><option value="">No appointment</option>{appointments.map((item) => <option key={item.id} value={item.id}>{item.date} · {item.patientName}</option>)}</select></label>
    <label className="block text-sm font-medium text-slate-700">Patient email<input required type="email" value={patientEmail} onChange={(event) => { setPatientEmail(event.target.value); setAppointmentId(''); }} className="mt-1 min-h-11 w-full rounded-lg border border-slate-300 px-3 py-2" /></label>
    <label className="block text-sm font-medium text-slate-700">Test name<input required value={testName} onChange={(event) => setTestName(event.target.value)} maxLength={160} className="mt-1 min-h-11 w-full rounded-lg border border-slate-300 px-3 py-2" /></label>
    <label className="block text-sm font-medium text-slate-700">Result summary<textarea required rows={4} maxLength={12000} value={summary} onChange={(event) => setSummary(event.target.value)} className="mt-1 w-full resize-y rounded-lg border border-slate-300 px-3 py-2" /></label>
    <label className="block text-sm font-medium text-slate-700">Priority<select value={priority} onChange={(event) => setPriority(event.target.value as typeof priority)} className="mt-1 min-h-11 w-full rounded-lg border border-slate-300 px-3 py-2"><option value="routine">Routine</option><option value="critical">Critical</option></select></label>
    <button disabled={saving} className="min-h-11 w-full rounded-lg bg-teal-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50 sm:w-auto">{saving ? 'Saving...' : 'Save result'}</button>
    <Feedback value={message} />
  </form>;
}

export function ResultReviewButton({ resultId, released }: { resultId: string; released: boolean }) {
  const [message, setMessage] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const router = useRouter();
  async function review(release: boolean) {
    setSaving(true); const result = await reviewDiagnosticResult(resultId, release); setSaving(false); setMessage(result.message);
    if (result.success) router.refresh();
  }
  return <div className="flex flex-col gap-2 sm:flex-row">
    <button onClick={() => review(false)} disabled={saving} className="min-h-11 rounded-lg border border-slate-300 px-3 text-sm font-medium text-slate-700 disabled:opacity-50">{saving ? 'Saving...' : 'Mark reviewed'}</button>
    {!released && <button onClick={() => { if (window.confirm('Release this result to the patient medical record?')) review(true); }} disabled={saving} className="min-h-11 rounded-lg bg-teal-700 px-3 text-sm font-medium text-white disabled:opacity-50">Release to patient</button>}
    <Feedback value={message} />
  </div>;
}

export function ClinicalItemForm({ patientEmail }: { patientEmail: string }) {
  const [type, setType] = useState<'allergy' | 'condition' | 'medication'>('allergy');
  const [name, setName] = useState('');
  const [details, setDetails] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const router = useRouter();
  async function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setSaving(true);
    const result = await addPatientClinicalItem({ patientEmail, type, name, details });
    setSaving(false); setMessage(result.message);
    if (result.success) { setName(''); setDetails(''); router.refresh(); }
  }
  return <form onSubmit={save} className="grid gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4 sm:grid-cols-2">
    <label className="block text-sm font-medium text-slate-700">Add chart item<select value={type} onChange={(event) => setType(event.target.value as typeof type)} className="mt-1 min-h-11 w-full rounded-lg border border-slate-300 bg-white px-3 py-2"><option value="allergy">Allergy</option><option value="condition">Condition</option><option value="medication">Medication</option></select></label>
    <label className="block text-sm font-medium text-slate-700">Name<input required value={name} onChange={(event) => setName(event.target.value)} maxLength={160} className="mt-1 min-h-11 w-full rounded-lg border border-slate-300 bg-white px-3 py-2" /></label>
    <label className="block text-sm font-medium text-slate-700 sm:col-span-2">Details<input value={details} onChange={(event) => setDetails(event.target.value)} maxLength={2000} className="mt-1 min-h-11 w-full rounded-lg border border-slate-300 bg-white px-3 py-2" placeholder="Reaction, dose, context, etc." /></label>
    <div><button disabled={saving} className="min-h-11 w-full rounded-lg bg-teal-700 px-4 text-sm font-medium text-white disabled:opacity-50 sm:w-auto">{saving ? 'Saving...' : 'Add to chart'}</button><Feedback value={message} /></div>
  </form>;
}

export function ResolveChartItemButton({ id }: { id: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  async function resolve() {
    setBusy(true); await resolvePatientClinicalItem(id); setBusy(false); router.refresh();
  }
  return <button onClick={resolve} disabled={busy} className="min-h-11 px-2 text-sm font-medium text-teal-800 underline disabled:opacity-50">{busy ? 'Updating...' : 'Resolve / archive'}</button>;
}

export function ScheduleBlockForm() {
  const [date, setDate] = useState('');
  const [startTime, setStart] = useState('');
  const [endTime, setEnd] = useState('');
  const [reason, setReason] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const router = useRouter();
  async function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setSaving(true);
    const result = await createScheduleBlock({ date, startTime, endTime, reason });
    setSaving(false); setMessage(result.message);
    if (result.success) { setReason(''); router.refresh(); }
  }
  return <form onSubmit={save} className="grid gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:grid-cols-2 sm:p-5">
    <h2 className="font-semibold text-slate-900 sm:col-span-2">Block unavailable time</h2>
    <label className="text-sm font-medium text-slate-700">Date<input type="date" required value={date} onChange={(event) => setDate(event.target.value)} min={new Date().toISOString().slice(0, 10)} className="mt-1 min-h-11 w-full rounded-lg border border-slate-300 px-3" /></label>
    <div className="grid grid-cols-2 gap-3"><label className="text-sm font-medium text-slate-700">From<input type="time" required value={startTime} onChange={(event) => setStart(event.target.value)} className="mt-1 min-h-11 w-full rounded-lg border border-slate-300 px-2" /></label><label className="text-sm font-medium text-slate-700">To<input type="time" required value={endTime} onChange={(event) => setEnd(event.target.value)} className="mt-1 min-h-11 w-full rounded-lg border border-slate-300 px-2" /></label></div>
    <label className="text-sm font-medium text-slate-700 sm:col-span-2">Reason<input required maxLength={200} value={reason} onChange={(event) => setReason(event.target.value)} placeholder="Surgery, leave, emergency..." className="mt-1 min-h-11 w-full rounded-lg border border-slate-300 px-3" /></label>
    <div className="sm:col-span-2"><button disabled={saving} className="min-h-11 w-full rounded-lg bg-teal-700 px-4 text-sm font-medium text-white disabled:opacity-50 sm:w-auto">{saving ? 'Saving...' : 'Save unavailable time'}</button><Feedback value={message} /></div>
  </form>;
}

export function CancelScheduleBlockButton({ id }: { id: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  async function cancel() {
    setBusy(true); await cancelScheduleBlock(id); setBusy(false); router.refresh();
  }
  return <button onClick={cancel} disabled={busy} className="min-h-11 text-sm font-medium text-rose-700 underline disabled:opacity-50">{busy ? 'Updating...' : 'Cancel block'}</button>;
}
