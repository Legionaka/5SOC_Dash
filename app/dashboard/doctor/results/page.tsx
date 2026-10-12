import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { fetchDoctorActionAppointments, fetchDoctorDiagnosticResults } from '@/app/lib/data';
import { DiagnosticResultForm, ResultReviewButton } from '../doctor-controls';

export default async function DoctorResultsPage() {
  const session = await auth();
  if (!session?.user.email || !session.user.role || !['admin', 'doctor'].includes(session.user.role)) redirect('/unauthorized');
  const isAdmin = session.user.role === 'admin';
  const [appointments, results] = await Promise.all([
    fetchDoctorActionAppointments(session.user.name ?? '', isAdmin),
    fetchDoctorDiagnosticResults(session.user.email, isAdmin),
  ]);
  const pending = results.filter((item) => item.status === 'Pending');
  const reviewed = results.filter((item) => item.status !== 'Pending');
  return (
    <main className="mx-auto w-full max-w-7xl space-y-6 pb-10">
      <header><p className="text-sm font-medium text-teal-700">Clinical workspace</p><h1 className="mt-1 text-2xl font-bold text-slate-900">Lab & diagnostic results</h1><p className="mt-1 text-sm text-slate-500">Review pending results, prioritize critical findings, and release approved results into the patient portal. External labs can post final FHIR R4 DiagnosticReports to the protected intake endpoint.</p><p className="mt-2 break-all rounded-lg bg-slate-50 p-3 font-mono text-xs text-slate-600">POST /api/integrations/labs · Authorization: Bearer LAB_INTEGRATION_TOKEN</p></header>
      <DiagnosticResultForm appointments={appointments.map((item) => ({ id: String(item.id), patientEmail: String(item.patient_email), patientName: String(item.patient_name), date: String(item.appointment_date), reason: String(item.reason) }))} />
      <section className="space-y-3"><h2 className="text-lg font-semibold text-slate-900">Awaiting review ({pending.length})</h2>{pending.length ? pending.map((item) => <article key={item.id} className={`min-w-0 rounded-2xl border bg-white p-4 shadow-sm sm:p-5 ${item.priority === 'critical' ? 'border-rose-300' : 'border-slate-200'}`}><div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between"><div className="min-w-0"><p className="break-words text-xs font-semibold uppercase tracking-wide text-teal-800">{item.patient_name} · {item.patient_email}</p><h3 className="mt-1 break-words font-semibold text-slate-900">{item.test_name}</h3></div><span className={`w-fit rounded-full px-2.5 py-1 text-xs font-semibold ${item.priority === 'critical' ? 'bg-rose-100 text-rose-800' : 'bg-slate-100 text-slate-700'}`}>{item.priority}</span></div><p className="mt-3 break-words whitespace-pre-wrap text-sm leading-6 text-slate-700">{item.result_summary}</p><p className="mt-2 text-xs text-slate-400">Source: {item.source_system} · Received {String(item.created_at)}{item.appointment_id ? ` · Visit ${String(item.appointment_id).slice(0, 8)}` : ''}</p><div className="mt-3"><ResultReviewButton resultId={String(item.id)} released={Boolean(item.released_at)} /></div></article>) : <p className="rounded-xl border border-dashed border-slate-300 bg-white p-5 text-sm text-slate-500">No results are waiting for review.</p>}</section>
      <section className="space-y-3"><h2 className="text-lg font-semibold text-slate-900">Reviewed results ({reviewed.length})</h2>{reviewed.slice(0, 30).map((item) => <article key={item.id} className="min-w-0 rounded-xl border border-slate-200 bg-white p-4"><div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between"><div className="min-w-0"><p className="break-words text-xs font-semibold uppercase tracking-wide text-slate-500">{item.patient_name} · {item.patient_email}</p><h3 className="mt-1 break-words font-semibold text-slate-900">{item.test_name}</h3></div><span className="w-fit rounded-full bg-emerald-50 px-2.5 py-1 text-xs text-emerald-800">Reviewed{item.released_at ? ' · released' : ''}</span></div><p className="mt-2 break-words whitespace-pre-wrap text-sm text-slate-700">{item.result_summary}</p><p className="mt-2 text-xs text-slate-400">Reviewed {String(item.reviewed_at ?? item.created_at)}</p>{!item.released_at && <div className="mt-3"><ResultReviewButton resultId={String(item.id)} released={false} /></div>}</article>)}</section>
    </main>
  );
}
