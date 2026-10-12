import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { fetchDoctorActionAppointments, fetchDoctorClinicalNotes } from '@/app/lib/data';
import { AddendumForm, ClinicalNoteForm, SignNoteButton } from '../doctor-controls';

export default async function DoctorNotesPage() {
  const session = await auth();
  if (!session?.user.email || !session.user.role || !['admin', 'doctor'].includes(session.user.role)) redirect('/unauthorized');
  const admin = session.user.role === 'admin';
  const [appointments, notes] = await Promise.all([
    fetchDoctorActionAppointments(session.user.name ?? '', admin),
    fetchDoctorClinicalNotes(session.user.email, admin),
  ]);
  const options = appointments.map((item) => ({ id: String(item.id), patientEmail: String(item.patient_email), patientName: String(item.patient_name), date: String(item.appointment_date), reason: String(item.reason) }));
  return <main className="mx-auto w-full max-w-7xl space-y-6 pb-10">
    <header><p className="text-sm font-medium text-teal-700">Clinical workspace</p><h1 className="mt-1 text-2xl font-bold text-slate-900">Clinical notes</h1><p className="mt-1 text-sm text-slate-500">Draft encounter notes, sign to lock them, and use an addendum for later changes.</p></header>
    <ClinicalNoteForm appointments={options} />
    <section className="space-y-3"><h2 className="text-lg font-semibold text-slate-900">Your notes ({notes.length})</h2>
      {notes.length ? notes.map((note) => <article key={note.id} className="min-w-0 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5"><div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between"><div><p className="break-all text-xs font-semibold text-teal-800">{note.patient_name} · {note.patient_email}</p><h3 className="mt-1 font-semibold text-slate-900">{note.title}</h3></div><span className="w-fit rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700">{note.status}</span></div><p className="mt-3 whitespace-pre-wrap break-words text-sm leading-6 text-slate-700">{note.content}</p><p className="mt-2 text-xs text-slate-400">Created {String(note.created_at)}{note.signed_at ? ` · Signed ${String(note.signed_at)}` : ''}</p>{note.status !== 'Signed' ? <div className="mt-3"><SignNoteButton noteId={String(note.id)} /></div> : note.appointment_id && <AddendumForm appointmentId={String(note.appointment_id)} signedNoteId={String(note.id)} />}</article>) : <p className="rounded-xl border border-dashed border-slate-300 bg-white p-5 text-sm text-slate-500">No clinical notes yet.</p>}
    </section>
  </main>;
}
