import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { fetchPatientMedicalRecords } from '@/app/lib/data';

export default async function PatientRecordsPage() {
  const session = await auth();
  if (session?.user.role !== 'patient' || !session.user.email) redirect('/unauthorized');
  const records = await fetchPatientMedicalRecords(session.user.email);
  return <main className="space-y-6"><div><p className="text-sm font-medium text-teal-700">My care</p><h1 className="mt-1 text-2xl font-bold text-slate-900">Medical records</h1><p className="mt-1 text-sm text-slate-500">Your clinical summaries and care documents.</p></div><div className="grid gap-4 md:grid-cols-2">{records.length === 0 ? <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-sm text-slate-500">No medical records are available yet.</div> : records.map((record) => <article key={record.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><div className="flex items-start justify-between gap-3"><div><p className="text-xs font-semibold uppercase tracking-wide text-teal-700">{record.record_type}</p><h2 className="mt-1 font-semibold text-slate-900">{record.title}</h2></div><span className="rounded-full bg-emerald-50 px-2 py-1 text-xs text-emerald-700">{record.status}</span></div><p className="mt-4 text-sm leading-6 text-slate-600">{record.summary}</p><p className="mt-4 text-xs text-slate-400">Recorded {String(record.recorded_at).slice(0, 10)}</p></article>)}</div></main>;
}
