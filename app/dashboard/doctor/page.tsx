import Link from 'next/link';
import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { fetchDoctorDashboardData } from '@/app/lib/data';
import DoctorQueueView from './queue-view';

const cards = [
  { href: '/dashboard/doctor/patients', label: 'Patient charts', detail: 'Review histories, conditions, allergies, and medications.' },
  { href: '/dashboard/doctor/results', label: 'Lab & diagnostic results', detail: 'Review pending results and release reviewed results.' },
  { href: '/dashboard/doctor/orders', label: 'Prescriptions & referrals', detail: 'Issue prescriptions for pharmacy review and track specialist referral approvals.' },
  { href: '/dashboard/doctor/notes', label: 'Clinical notes', detail: 'Draft, sign, and append to signed encounter notes.' },
  { href: '/dashboard/doctor/availability', label: 'Schedule & unavailable time', detail: 'Review recurring slots and block dates or times.' },
  { href: '/dashboard/doctor/requests', label: 'Patient tasks & messages', detail: 'Respond to patient questions and refill requests.' },
  { href: '/dashboard/calendar', label: 'Availability calendar', detail: 'View configured recurring appointment slots.' },
];

export default async function DoctorDashboardPage() {
  const session = await auth();
  if (!session?.user.email || !session.user.role || !['admin', 'doctor'].includes(session.user.role)) redirect('/unauthorized');
  const data = await fetchDoctorDashboardData(session.user.email, session.user.name ?? '', session.user.role === 'admin');

  const metrics = [
    { label: 'Visits in the next 7 days', value: data.appointments.length, note: 'Scheduled and awaiting confirmation' },
    { label: 'Patients seen', value: data.patientCount, note: 'Patients with appointments on file' },
    { label: 'Pending results', value: data.pendingResults, note: 'Awaiting clinical review', urgent: data.criticalResults > 0 },
    { label: 'Open patient tasks', value: data.openTasks, note: 'Questions, refills, and appointment requests' },
  ];

  return (
    <main className="mx-auto w-full max-w-7xl space-y-6 pb-12 sm:space-y-8">
      <header className="rounded-3xl border border-teal-100 bg-gradient-to-br from-teal-50 via-white to-blue-50 p-4 shadow-sm sm:p-6 md:p-8">
        <p className="text-sm font-semibold uppercase tracking-[0.14em] text-teal-700">Clinical workspace</p>
        <h1 className="mt-2 text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">Good day, {session.user.name ?? 'Doctor'}</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">Today’s appointments, patient records, results that need review, and clinical tasks.</p>
        <div className="mt-5 flex flex-col gap-2 min-[420px]:flex-row">
          <Link href="/dashboard/queue" className="inline-flex min-h-11 items-center justify-center rounded-xl bg-teal-700 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-800">Open appointment queue</Link>
          <Link href="/dashboard/doctor/patients" className="inline-flex min-h-11 items-center justify-center rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:border-teal-300">Find a patient</Link>
        </div>
      </header>

      <section aria-label="Clinical overview" className="grid gap-3 min-[520px]:grid-cols-2 xl:grid-cols-4">
        {metrics.map((item) => <article key={item.label} className={`min-w-0 rounded-2xl border bg-white p-4 shadow-sm sm:p-5 ${item.urgent ? 'border-rose-300 ring-1 ring-rose-100' : 'border-slate-200'}`}>
          <p className="text-sm font-medium text-slate-600">{item.label}</p>
          <p className={`mt-2 text-3xl font-bold ${item.urgent ? 'text-rose-700' : 'text-slate-950'}`}>{item.value}</p>
          <p className="mt-1 text-xs leading-5 text-slate-500">{item.urgent ? `${data.criticalResults} critical result${data.criticalResults === 1 ? '' : 's'} need attention.` : item.note}</p>
        </article>)}
      </section>

      {data.criticalResults > 0 && <Link href="/dashboard/doctor/results" className="block rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm font-semibold text-rose-800">{data.criticalResults} critical diagnostic result{data.criticalResults === 1 ? '' : 's'} awaiting review. Review results now →</Link>}

      <section className="space-y-4">
        <div className="flex flex-col gap-2 min-[520px]:flex-row min-[520px]:items-end min-[520px]:justify-between">
          <div><h2 className="text-lg font-semibold text-slate-900">Upcoming clinical queue</h2><p className="text-sm text-slate-500">Appointments for the next seven days with patient check-in controls.</p></div>
          <Link href="/dashboard/queue" className="inline-flex min-h-11 items-center text-sm font-semibold text-teal-800">Full queue →</Link>
        </div>
        <DoctorQueueView appointments={data.appointments.slice(0, 5)} />
      </section>

      <section>
        <div className="mb-3"><h2 className="text-lg font-semibold text-slate-900">Clinical tools</h2><p className="text-sm text-slate-500">Open a workflow to continue patient care.</p></div>
        <div className="grid gap-3 min-[520px]:grid-cols-2 xl:grid-cols-3">
          {cards.map((card) => <Link key={card.href} href={card.href} className="min-w-0 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-teal-300 hover:shadow-md sm:p-5">
            <h3 className="font-semibold text-slate-900">{card.label}</h3><p className="mt-1 text-sm leading-5 text-slate-500">{card.detail}</p><span className="mt-3 inline-flex min-h-11 items-center text-sm font-semibold text-teal-800">Open →</span>
          </Link>)}
        </div>
      </section>

      {data.blocks.length > 0 && <section className="rounded-2xl border border-amber-200 bg-amber-50 p-4 sm:p-5"><h2 className="font-semibold text-amber-950">Your upcoming unavailable times</h2><ul className="mt-2 space-y-2 text-sm text-amber-900">{data.blocks.map((block) => <li key={block.id}>{block.date}, {block.start}–{block.end}: {block.reason}</li>)}</ul></section>}
    </main>
  );
}
