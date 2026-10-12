import Link from 'next/link';
import { auth } from '@/auth';
import { notFound, redirect } from 'next/navigation';
import { fetchDoctorPatientChart } from '@/app/lib/data';
import { AddendumForm, ClinicalItemForm, ResolveChartItemButton, SignNoteButton } from '../../doctor-controls';

export default async function DoctorPatientChartPage({ params }: { params: Promise<{ email: string }> }) {
  const session = await auth();
  if (!session?.user.email || !session.user.role || !['admin', 'doctor'].includes(session.user.role)) redirect('/unauthorized');
  const { email: rawEmail } = await params;
  const email = decodeURIComponent(rawEmail);
  const chart = await fetchDoctorPatientChart(email);
  if (!chart) notFound();
  const activeItems = chart.items.filter((item) => item.status === 'Active');
  const grouped = ['allergy', 'condition', 'medication'] as const;

  return (
    <main className="mx-auto w-full max-w-7xl space-y-5 pb-10 sm:space-y-6">
      <header className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:flex-row sm:items-start sm:justify-between sm:p-6">
        <div className="min-w-0"><Link href="/dashboard/doctor/patients" className="text-sm font-medium text-teal-800">← Patient charts</Link><h1 className="mt-2 break-words text-2xl font-bold text-slate-900">{chart.patient.name}</h1><p className="break-all text-sm text-slate-500">{chart.patient.email}</p><p className="mt-2 text-sm text-slate-600">Patient ID: {chart.patient.patient_number ?? 'Not set'} · Date of birth: {chart.patient.date_of_birth ? String(chart.patient.date_of_birth).slice(0, 10) : 'Not set'}</p></div>
        <a href={`mailto:${chart.patient.email}`} className="inline-flex min-h-11 w-fit items-center rounded-lg border border-slate-300 px-4 text-sm font-medium text-slate-700">Contact patient</a>
      </header>

      <section className="grid gap-4 md:grid-cols-3">
        {grouped.map((type) => {
          const items = activeItems.filter((item) => item.item_type === type);
          return <article key={type} className="min-w-0 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
            <h2 className="font-semibold capitalize text-slate-900">{type === 'medication' ? 'Active medications' : `${type}s`}</h2>
            {items.length ? <ul className="mt-3 space-y-3">{items.map((item) => <li key={item.id} className="min-w-0 border-t border-slate-100 pt-3 first:border-0 first:pt-0"><p className="break-words text-sm font-medium text-slate-800">{item.item_name}</p>{item.details && <p className="mt-1 break-words text-xs leading-5 text-slate-500">{item.details}</p>}<ResolveChartItemButton id={String(item.id)} /></li>)}</ul> : <p className="mt-2 text-sm text-slate-500">No active {type} entries recorded.</p>}
          </article>;
        })}
      </section>

      <ClinicalItemForm patientEmail={email} />

      <section className="grid gap-5 xl:grid-cols-2"><div className="space-y-3"><h2 className="text-lg font-semibold text-slate-900">Prescription history</h2>{chart.prescriptions.length ? chart.prescriptions.map((item) => <article key={item.id} className="rounded-xl border border-slate-200 bg-white p-4"><div className="flex flex-wrap items-center justify-between gap-2"><h3 className="font-semibold text-slate-900">{item.medication_name} {item.strength}</h3><span className="rounded-full bg-slate-100 px-2 py-1 text-xs text-slate-700">{item.status}</span></div><p className="mt-2 break-words text-sm text-slate-700">{item.directions}</p><p className="mt-2 text-xs text-slate-500">Quantity {item.quantity} · Refills {item.refills}{item.pharmacy ? ` · ${item.pharmacy}` : ''}</p>{item.pharmacist_note && <p className="mt-2 text-xs text-amber-900">Pharmacy note: {item.pharmacist_note}</p>}</article>) : <p className="rounded-xl border border-dashed border-slate-300 bg-white p-5 text-sm text-slate-500">No prescriptions found.</p>}</div><div className="space-y-3"><h2 className="text-lg font-semibold text-slate-900">Referral history</h2>{chart.referrals.length ? chart.referrals.map((item) => <article key={item.id} className="rounded-xl border border-slate-200 bg-white p-4"><div className="flex flex-wrap items-center justify-between gap-2"><h3 className="font-semibold text-slate-900">{item.specialty}{item.destination ? ` · ${item.destination}` : ''}</h3><span className="rounded-full bg-slate-100 px-2 py-1 text-xs text-slate-700">{item.urgency} · {item.status}</span></div><p className="mt-2 break-words text-sm text-slate-700">{item.reason}</p></article>) : <p className="rounded-xl border border-dashed border-slate-300 bg-white p-5 text-sm text-slate-500">No referrals recorded.</p>}</div></section>

      <section className="grid gap-5 xl:grid-cols-2">
        <div className="min-w-0 space-y-3">
          <h2 className="text-lg font-semibold text-slate-900">Diagnostic results</h2>
          {chart.results.length ? chart.results.map((result) => <article key={result.id} className="min-w-0 rounded-xl border border-slate-200 bg-white p-4"><div className="flex flex-wrap items-center justify-between gap-2"><h3 className="break-words font-semibold text-slate-900">{result.test_name}</h3><span className={`rounded-full px-2 py-1 text-xs font-medium ${result.priority === 'critical' ? 'bg-rose-100 text-rose-800' : 'bg-slate-100 text-slate-700'}`}>{result.priority} · {result.status}{result.released_at ? ' · released' : ''}</span></div><p className="mt-2 break-words whitespace-pre-wrap text-sm leading-6 text-slate-700">{result.result_summary}</p><p className="mt-3 text-xs text-slate-400">Added {String(result.created_at)}</p></article>) : <p className="rounded-xl border border-dashed border-slate-300 bg-white p-5 text-sm text-slate-500">No diagnostic results recorded.</p>}
        </div>

        <div className="min-w-0 space-y-3">
          <h2 className="text-lg font-semibold text-slate-900">Clinical notes</h2>
          {chart.notes.length ? chart.notes.map((note) => <article key={note.id} className="min-w-0 rounded-xl border border-slate-200 bg-white p-4"><div className="flex flex-wrap items-center justify-between gap-2"><h3 className="break-words font-semibold text-slate-900">{note.title}</h3><span className="rounded-full bg-slate-100 px-2 py-1 text-xs text-slate-700">{note.status}</span></div><p className="mt-2 break-words whitespace-pre-wrap text-sm leading-6 text-slate-700">{note.content}</p><p className="mt-2 text-xs text-slate-400">{note.status === 'Signed' ? `Signed ${String(note.signed_at)}` : `Created ${String(note.created_at)}`}</p>{note.status === 'Draft' && <div className="mt-3"><SignNoteButton noteId={String(note.id)} /></div>}{note.status === 'Signed' && note.appointment_id && <AddendumForm appointmentId={String(note.appointment_id)} signedNoteId={String(note.id)} />}</article>) : <p className="rounded-xl border border-dashed border-slate-300 bg-white p-5 text-sm text-slate-500">No clinical notes recorded.</p>}
        </div>
      </section>

      <section className="space-y-3"><h2 className="text-lg font-semibold text-slate-900">Appointment history</h2>{chart.appointments.length ? chart.appointments.map((item) => <article key={item.id} className="grid gap-2 rounded-xl border border-slate-200 bg-white p-4 sm:grid-cols-2"><div><p className="font-medium text-slate-900">{item.specialty} · {String(item.appointment_date)} at {item.appointment_time}</p><p className="text-sm text-slate-600">{item.reason}</p></div><div className="text-sm text-slate-500 sm:text-right"><p>{item.doctor_name}</p><p>{item.status} · {item.check_in_status ?? 'Not checked in'}</p></div></article>) : <p className="rounded-xl border border-dashed border-slate-300 bg-white p-5 text-sm text-slate-500">No appointments recorded.</p>}</section>

      <section className="space-y-3"><h2 className="text-lg font-semibold text-slate-900">Released and shared records</h2>{chart.medicalRecords.length ? chart.medicalRecords.map((record) => <article key={record.id} className="rounded-xl border border-slate-200 bg-white p-4"><p className="text-xs font-semibold uppercase tracking-wide text-teal-800">{record.record_type} · {String(record.recorded_at).slice(0, 10)}</p><h3 className="mt-1 font-semibold text-slate-900">{record.title}</h3><p className="mt-2 break-words text-sm leading-6 text-slate-600">{record.summary}</p></article>) : <p className="rounded-xl border border-dashed border-slate-300 bg-white p-5 text-sm text-slate-500">No released records.</p>}</section>
    </main>
  );
}
