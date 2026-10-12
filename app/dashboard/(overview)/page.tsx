import RevenueChart from '@/app/ui/dashboard/revenue-chart';
import LatestInvoices from '@/app/ui/dashboard/latest-invoices';
import { lusitana } from '@/app/ui/fonts';
import { Suspense } from 'react';
import {
  RevenueChartSkeleton,
  LatestInvoicesSkeleton,
} from '@/app/ui/skeletons';
import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { fetchAdminDashboardData } from '@/app/lib/data';
import Link from 'next/link';

export default async function Page() {
  const session = await auth();
  if (session?.user.role !== 'admin') redirect('/unauthorized');
  const operations = await fetchAdminDashboardData();
  const metrics = [
    { label: "Today's appointments", value: operations.appointments, detail: `${operations.checkedIn} checked in` },
    { label: 'Patients still waiting', value: operations.waiting, detail: 'Not yet checked in' },
    { label: 'Open patient requests', value: operations.openTasks, detail: 'Messages and service requests' },
    { label: 'Pending invoices', value: operations.pendingInvoices, detail: 'Awaiting payment' },
  ];
  const shortcuts = [
    { href: '/dashboard/queue', title: 'Appointment queue', detail: 'Check-ins and today’s clinic flow.' },
    { href: '/dashboard/calendar', title: 'Staff calendar', detail: 'Review doctor availability and blocked times.' },
    { href: '/dashboard/admin/staff', title: 'Staff accounts', detail: `Manage ${operations.staff} staff accounts; ${operations.doctors} doctors and ${operations.nurses} nurses.` },
    { href: '/dashboard/customers', title: 'Patient directory', detail: 'Find patients and review their account records.' },
    { href: '/dashboard/invoices', title: 'Billing', detail: 'Create and manage patient invoices.' },
    { href: '/dashboard/doctor/requests', title: 'Patient messages', detail: 'Review questions and requests from patients.' },
  ];
  return (
    <main className="mx-auto w-full max-w-7xl space-y-7 pb-10">
      <header className="rounded-3xl border border-teal-100 bg-gradient-to-br from-teal-50 via-white to-blue-50 p-5 shadow-sm sm:p-7">
        <p className="text-sm font-semibold uppercase tracking-[0.14em] text-teal-700">Clinic operations</p>
        <h1 className={`${lusitana.className} mt-2 text-2xl font-bold text-slate-950 sm:text-3xl`}>Admin overview</h1>
        <p className="mt-2 text-sm leading-6 text-slate-600">Today’s appointment flow, staff coverage, patient requests, and billing follow-up.</p>
      </header>

      <section aria-label="Today's operations" className="grid gap-3 min-[520px]:grid-cols-2 xl:grid-cols-4">
        {metrics.map((item) => <article key={item.label} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5"><p className="text-sm font-medium text-slate-600">{item.label}</p><p className="mt-2 text-3xl font-bold text-slate-950">{item.value}</p><p className="mt-1 text-xs text-slate-500">{item.detail}</p></article>)}
      </section>

      {(operations.waiting > 0 || operations.openTasks > 0) && <section className="grid gap-3 sm:grid-cols-2" aria-label="Items needing attention">
        {operations.waiting > 0 && <Link href="/dashboard/queue" className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950"><strong>{operations.waiting} patient{operations.waiting === 1 ? '' : 's'} not checked in</strong><span className="mt-1 block">Open the appointment queue to follow up.</span></Link>}
        {operations.openTasks > 0 && <Link href="/dashboard/doctor/requests" className="rounded-xl border border-sky-200 bg-sky-50 p-4 text-sm text-sky-950"><strong>{operations.openTasks} patient request{operations.openTasks === 1 ? '' : 's'} open</strong><span className="mt-1 block">Review messages and service requests.</span></Link>}
      </section>}

      <section><div className="mb-3"><h2 className="text-lg font-semibold text-slate-900">Operations</h2><p className="text-sm text-slate-500">Open a workspace to manage the day-to-day clinic tasks.</p></div><div className="grid gap-3 min-[520px]:grid-cols-2 xl:grid-cols-3">{shortcuts.map((item) => <Link key={item.href} href={item.href} className="min-w-0 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-teal-300 hover:shadow-md sm:p-5"><h3 className="font-semibold text-slate-900">{item.title}</h3><p className="mt-1 text-sm leading-5 text-slate-500">{item.detail}</p><span className="mt-3 inline-flex min-h-11 items-center text-sm font-semibold text-teal-800">Open workspace →</span></Link>)}</div></section>

      <section><div className="mb-3"><h2 className="text-lg font-semibold text-slate-900">Financial overview</h2><p className="text-sm text-slate-500">Revenue and recent invoice activity.</p></div><div className="grid grid-cols-1 gap-6 md:grid-cols-4 lg:grid-cols-8"><Suspense fallback={<RevenueChartSkeleton />}><RevenueChart /></Suspense><Suspense fallback={<LatestInvoicesSkeleton />}><LatestInvoices /></Suspense></div></section>
    </main>
  );
}
