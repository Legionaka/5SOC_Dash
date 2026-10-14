import { Suspense } from 'react';
import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { lusitana } from '@/app/ui/fonts';
import { getDashboardHome } from '@/app/lib/access-control';
import { AdminInsights, OperationsSummary, OperationsSummarySkeleton } from './dashboard-content';

function InsightsSkeleton() {
  return <section aria-label="Loading dashboard insights" aria-live="polite" role="status" className="space-y-4"><div className="flex items-center gap-3 rounded-2xl border border-teal-100 bg-teal-50 px-4 py-3 text-sm text-teal-950"><span className="h-3 w-3 animate-pulse rounded-full bg-teal-600" /><span>Loading live dashboard data. Backup data will appear automatically if the database takes too long.</span></div><div className="grid animate-pulse gap-6 xl:grid-cols-2"><div className="h-[420px] rounded-2xl border border-slate-200 bg-white p-5"><div className="h-5 w-48 rounded bg-slate-200" /><div className="mt-3 h-4 w-72 rounded bg-slate-100" /><div className="mt-8 h-64 rounded-xl bg-slate-100" /><div className="mt-5 h-4 w-36 rounded bg-slate-100" /></div><div className="h-[420px] rounded-2xl border border-slate-200 bg-white p-5"><div className="h-5 w-56 rounded bg-slate-200" /><div className="mt-3 h-4 w-64 rounded bg-slate-100" /><div className="mt-8 flex items-center justify-center"><div className="h-48 w-48 rounded-full border-[28px] border-slate-100" /></div><div className="mt-8 space-y-2"><div className="h-3 w-full rounded bg-slate-100" /><div className="h-3 w-4/5 rounded bg-slate-100" /></div></div></div></section>;
}

export default async function Page() {
  const session = await auth();
  if (!session?.user) redirect('/');
  if (session.user.mustChangePassword) redirect('/change-password');
  if (session.user.role !== 'admin') redirect(getDashboardHome(session.user.role));

  return (
    <main className="mx-auto w-full max-w-7xl space-y-7 pb-10">
      <header className="rounded-3xl border border-teal-100 bg-gradient-to-br from-teal-50 via-white to-blue-50 p-5 shadow-sm sm:p-7">
        <p className="text-sm font-semibold uppercase tracking-[0.14em] text-teal-700">Clinic operations</p>
        <h1 className={`${lusitana.className} mt-2 text-2xl font-bold text-slate-950 sm:text-3xl`}>Admin overview</h1>
        <p className="mt-2 text-sm leading-6 text-slate-600">Today's appointment flow, staff coverage, patient requests, and billing follow-up.</p>
      </header>
      <Suspense fallback={<OperationsSummarySkeleton />}>
        <OperationsSummary />
      </Suspense>
      <Suspense fallback={<InsightsSkeleton />}>
        <AdminInsights />
      </Suspense>
    </main>
  );
}
