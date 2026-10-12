import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { fetchPatientMedicalRecords, fetchPatientPrescriptions, fetchPatientReferrals } from '@/app/lib/data';

export default async function PatientRecordsPage() {
  const session = await auth();
  if (session?.user.role !== 'patient' || !session.user.email) redirect('/unauthorized');
  const [records, prescriptions, referrals] = await Promise.all([
    fetchPatientMedicalRecords(session.user.email),
    fetchPatientPrescriptions(session.user.email),
    fetchPatientReferrals(session.user.email),
  ]);

  return (
    <main className="mx-auto w-full max-w-7xl space-y-5 sm:space-y-6">
      <header>
        <p className="text-sm font-medium text-teal-700">My care</p>
        <h1 className="mt-1 text-2xl font-bold text-slate-900">Medical records</h1>
        <p className="mt-1 text-sm text-slate-500">Your clinical summaries and care documents.</p>
      </header>
      <section className="space-y-3"><h2 className="text-lg font-semibold text-slate-900">Prescriptions</h2>{prescriptions.length ? <div className="grid min-w-0 gap-3 md:grid-cols-2">{prescriptions.map((item) => <article key={item.id} className="min-w-0 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"><div className="flex flex-wrap items-start justify-between gap-2"><h3 className="break-words font-semibold text-slate-900">{item.medication_name} {item.strength}</h3><span className="rounded-full bg-teal-50 px-2 py-1 text-xs text-teal-800">{item.status}</span></div><p className="mt-2 break-words text-sm text-slate-600">{item.directions}</p><p className="mt-2 text-xs text-slate-500">Quantity {item.quantity} · Refills {item.refills}{item.pharmacy ? ` · ${item.pharmacy}` : ''}</p></article>)}</div> : <p className="rounded-xl border border-dashed border-slate-300 bg-white p-4 text-sm text-slate-500">No prescriptions are available.</p>}</section>
      {referrals.length > 0 && <section className="space-y-3"><h2 className="text-lg font-semibold text-slate-900">Specialist referrals</h2><div className="grid min-w-0 gap-3 md:grid-cols-2">{referrals.map((item) => <article key={item.id} className="min-w-0 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"><div className="flex flex-wrap items-start justify-between gap-2"><h3 className="break-words font-semibold text-slate-900">{item.specialty}{item.destination ? ` · ${item.destination}` : ''}</h3><span className="rounded-full bg-slate-100 px-2 py-1 text-xs text-slate-700">{item.status}</span></div><p className="mt-2 break-words text-sm text-slate-600">{item.reason}</p><p className="mt-2 text-xs text-slate-500">{item.urgency} · {item.sent_at ? `Sent ${String(item.sent_at).slice(0, 10)}` : `Created ${String(item.created_at).slice(0, 10)}`}</p></article>)}</div></section>}
      <div className="grid min-w-0 gap-4 md:grid-cols-2">
        {records.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-5 text-sm text-slate-500 sm:p-8">
            No medical records are available yet.
          </div>
        ) : records.map((record) => (
          <article key={record.id} className="min-w-0 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
            <div className="flex flex-col gap-2 min-[420px]:flex-row min-[420px]:items-start min-[420px]:justify-between">
              <div className="min-w-0">
                <p className="break-words text-xs font-semibold uppercase tracking-wide text-teal-700">{record.record_type}</p>
                <h2 className="mt-1 break-words font-semibold text-slate-900">{record.title}</h2>
              </div>
              <span className="w-fit shrink-0 rounded-full bg-emerald-50 px-2 py-1 text-xs text-emerald-700">{record.status}</span>
            </div>
            <p className="mt-4 break-words text-sm leading-6 text-slate-600">{record.summary}</p>
            <p className="mt-4 text-xs text-slate-400">Recorded {String(record.recorded_at).slice(0, 10)}</p>
          </article>
        ))}
      </div>
    </main>
  );
}
