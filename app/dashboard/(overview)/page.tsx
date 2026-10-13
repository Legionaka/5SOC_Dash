import { Suspense } from 'react';
import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { lusitana } from '@/app/ui/fonts';
import { getDashboardHome } from '@/app/lib/access-control';
import { AdminInsights, OperationsSummary, OperationsSummarySkeleton } from './dashboard-content';

function InsightsSkeleton() {
  return <section aria-label="Loading dashboard insights" className="grid animate-pulse gap-6 xl:grid-cols-2"><div className="h-[420px] rounded-2xl bg-slate-100" /><div className="h-[420px] rounded-2xl bg-slate-100" /></section>;
}

export default async function Page() {
  const session = await auth();
  if (!session?.user) redirect('/login');
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
