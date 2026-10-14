import Link from 'next/link';
import RevenueChart from '@/app/ui/dashboard/revenue-chart';
import LatestInvoices from '@/app/ui/dashboard/latest-invoices';
import AppointmentStatusChart from '@/app/ui/dashboard/appointment-status-chart';
import { fetchAdminDashboardData, fetchAdminOperationsReport } from '@/app/lib/data';
import { formatCurrency } from '@/app/lib/utils';
import { withTimeout } from '@/app/lib/with-timeout';
import { dashboardDemoOperations, dashboardDemoReport, type AdminReport } from '@/app/lib/dashboard-demo-data';

// Supabase/Postgres serverless connections can take a few seconds to wake up.
// Keep the fallback, but do not treat a normal cold connection as a database outage.
const DATABASE_WAIT_MS = 8000;

function DemoDataNotice() {
  return (
    <div role="status" className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-950">
      <p className="font-semibold">Showing backup demo data because the live database did not respond in 8 seconds.</p>
      <p className="mt-1">These figures are fictional and are not clinic records. Check the database connection and refresh before presenting live results.</p>
      <Link href="/dashboard" className="mt-2 inline-flex min-h-10 items-center font-semibold underline underline-offset-2">Retry live data</Link>
    </div>
  );
}

export function OperationsSummarySkeleton() {
  return <section aria-label="Loading clinic operations" className="grid animate-pulse gap-3 min-[520px]:grid-cols-2 xl:grid-cols-4">{Array.from({ length: 4 }, (_, index) => <div key={index} className="h-32 rounded-2xl bg-slate-100" />)}</section>;
}

export async function OperationsSummary() {
  type Operations = Awaited<ReturnType<typeof fetchAdminDashboardData>>;
  let operations: Operations;
  let usingDemoData = false;
  try {
    operations = await withTimeout(fetchAdminDashboardData(), DATABASE_WAIT_MS, 'Clinic operations');
  } catch (error) {
    console.error('Admin overview data unavailable:', error);
    operations = dashboardDemoOperations;
    usingDemoData = true;
  }

  const metrics = [
    { label: "Today's appointments", value: operations.appointments, detail: `${operations.checkedIn} checked in` },
    { label: 'Patients still waiting', value: operations.waiting, detail: 'Not yet checked in' },
    { label: 'Open patient requests', value: operations.openTasks, detail: 'Messages and service requests' },
    { label: 'Pending invoices', value: operations.pendingInvoices, detail: 'Awaiting payment' },
  ];
  const shortcuts = [
    { href: '/dashboard/queue', title: 'Appointment queue', detail: "Check-ins and today's clinic flow." },
    { href: '/dashboard/calendar', title: 'Staff calendar', detail: 'Review doctor availability and blocked times.' },
    { href: '/dashboard/admin/staff', title: 'Staff accounts', detail: `Manage ${operations.staff} staff accounts; ${operations.doctors} doctors and ${operations.nurses} nurses.` },
    { href: '/dashboard/customers', title: 'Patient directory', detail: 'Find patients and review their account records.' },
    { href: '/dashboard/invoices', title: 'Billing', detail: 'Create and manage patient invoices.' },
    { href: '/dashboard/doctor/requests', title: 'Patient messages', detail: 'Review questions and requests from patients.' },
  ];

  return <>
    {usingDemoData && <DemoDataNotice />}
    <section aria-label="Today's operations" className="grid gap-3 min-[520px]:grid-cols-2 xl:grid-cols-4">
      {metrics.map((item) => <article key={item.label} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5"><p className="text-sm font-medium text-slate-600">{item.label}</p><p className="mt-2 text-3xl font-bold text-slate-950">{item.value}</p><p className="mt-1 text-xs text-slate-500">{item.detail}</p></article>)}
    </section>
    {(operations.waiting > 0 || operations.openTasks > 0) && <section className="grid gap-3 sm:grid-cols-2" aria-label="Items needing attention">
      {operations.waiting > 0 && <Link href="/dashboard/queue" className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950"><strong>{operations.waiting} patient{operations.waiting === 1 ? '' : 's'} not checked in</strong><span className="mt-1 block">Open the appointment queue to follow up.</span></Link>}
      {operations.openTasks > 0 && <Link href="/dashboard/doctor/requests" className="rounded-xl border border-sky-200 bg-sky-50 p-4 text-sm text-sky-950"><strong>{operations.openTasks} patient request{operations.openTasks === 1 ? '' : 's'} open</strong><span className="mt-1 block">Review messages and service requests.</span></Link>}
    </section>}
    <section><div className="mb-3"><h2 className="text-lg font-semibold text-slate-900">Operations</h2><p className="text-sm text-slate-500">Open a workspace to manage the day-to-day clinic tasks.</p></div><div className="grid gap-3 min-[520px]:grid-cols-2 xl:grid-cols-3">{shortcuts.map((item) => <Link key={item.href} href={item.href} className="min-w-0 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-teal-300 hover:shadow-md sm:p-5"><h3 className="font-semibold text-slate-900">{item.title}</h3><p className="mt-1 text-sm leading-5 text-slate-500">{item.detail}</p><span className="mt-3 inline-flex min-h-11 items-center text-sm font-semibold text-teal-800">Open workspace →</span></Link>)}</div></section>
  </>;
}

export async function AdminInsights() {
  type Report = AdminReport;
  let report: Report;
  let usingDemoData = false;
  try {
    report = await withTimeout(fetchAdminOperationsReport(), DATABASE_WAIT_MS, 'Dashboard insights');
  } catch (error) {
    console.error('Admin report data unavailable:', error);
    report = dashboardDemoReport;
    usingDemoData = true;
  }

  return <>
    {usingDemoData && <DemoDataNotice />}
    <section className="space-y-3"><div><h2 className="text-lg font-semibold text-slate-900">Dashboard insights</h2><p className="text-sm text-slate-500">Billing trends and today's appointment flow.</p></div><div className="grid gap-6 xl:grid-cols-2"><RevenueChart /><AppointmentStatusChart data={report.appointmentStatuses} upcomingCount={report.upcoming} isDemoData={usingDemoData} /></div><div className="grid gap-6 xl:grid-cols-2"><LatestInvoices /></div></section>
    <section className="space-y-3"><div><h2 className="text-lg font-semibold text-slate-900">Clinic operations report</h2><p className="text-sm text-slate-500">Appointment coverage and invoice totals based on current database records.</p></div><div className="grid gap-3 lg:grid-cols-2">
      <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5"><h3 className="font-semibold text-slate-900">Invoice status totals</h3><div className="mt-3 space-y-2">{report.payments.length ? report.payments.map((item) => <div key={item.status} className="flex items-center justify-between gap-3 text-sm"><span className="capitalize text-slate-600">{item.status} · {item.count}</span><span className="font-semibold text-slate-900">{formatCurrency(Number(item.cents))}</span></div>) : <p className="text-sm text-slate-500">No invoice records yet.</p>}</div><Link href="/dashboard/invoices" className="mt-3 inline-flex min-h-11 items-center text-sm font-semibold text-teal-800">Manage invoices →</Link></article>
      <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5"><h3 className="font-semibold text-slate-900">Recent staff activity</h3><div className="mt-3 space-y-3">{report.recentActivity.length ? report.recentActivity.map((item) => <div key={`${item.action}-${item.created_at}`} className="border-b border-slate-100 pb-2 last:border-0"><p className="break-words text-sm font-medium text-slate-800">{String(item.action).replaceAll('_', ' ')}</p><p className="break-all text-xs text-slate-500">{item.actor_email} · {String(item.created_at)}</p></div>) : <p className="text-sm text-slate-500">No staff activity has been recorded.</p>}</div></article>
    </div></section>
  </>;
}
