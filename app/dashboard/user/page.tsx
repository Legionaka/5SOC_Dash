import { auth } from '@/auth';
import { lusitana } from '@/app/ui/fonts';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { TEST_PATIENT_EMAIL } from '@/app/lib/access-control';
import { fetchPatientDashboardData, fetchPatientRequests, fetchPatientMedicationReminders } from '@/app/lib/data';
import {
  PatientAppointmentsSection,
  PatientInvoicesSection,
  PatientSupportSection,
  PatientWalletSection,
} from './client-components';
import PatientDashboardEnhancements from './dashboard-enhancements';
import MedicationReminders from './medication-reminders';
import {
  BellAlertIcon,
  CalendarDaysIcon,
  DocumentTextIcon,
  PencilIcon,
  UserCircleIcon,
  WalletIcon,
} from '@heroicons/react/24/outline';

export default async function PatientDashboardPage() {
  const session = await auth();
  const isPatient = session?.user.role === 'patient';
  const isTestPatient = session?.user.email === TEST_PATIENT_EMAIL;
  if (!isPatient || !isTestPatient) {
    redirect('/unauthorized');
  }

  const data = await fetchPatientDashboardData(session.user.email!);
  const [requests, medicationReminders] = await Promise.all([
    fetchPatientRequests(session.user.email!),
    fetchPatientMedicationReminders(session.user.email!),
  ]);

  return (
    <main className="mx-auto w-full max-w-7xl space-y-8 pb-12">
      {/* Header */}
      <header className="overflow-hidden rounded-3xl border border-teal-100 bg-gradient-to-br from-teal-50 via-white to-blue-50 p-6 shadow-sm md:p-8">
        <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.16em] text-teal-700">Your care hub</p>
            <h1 className={`${lusitana.className} mt-2 text-3xl font-bold tracking-tight text-slate-950 md:text-4xl`}>
              Welcome back, {data.patient?.name ?? 'Patient'}
            </h1>
            <p className="mt-2 max-w-xl text-sm leading-6 text-slate-600">Manage appointments, review your care history, and stay connected with your clinic team.</p>
          </div>
          <Link href="/dashboard/user/notifications" className="inline-flex w-fit items-center gap-2 rounded-full border border-teal-200 bg-white/80 px-3 py-2 text-sm font-medium text-teal-800 shadow-sm transition hover:border-teal-400">
            <BellAlertIcon className="h-4 w-4" />
            {data.unreadNotifications ? `${data.unreadNotifications} new notifications` : 'No new notifications'}
          </Link>
        </div>
        <div className="mt-7 grid gap-2 sm:grid-cols-3">
          <Link href="/dashboard/user/appointments" className="inline-flex items-center gap-2 rounded-xl bg-teal-700 px-4 py-3 text-sm font-semibold text-white transition hover:bg-teal-800"><CalendarDaysIcon className="h-5 w-5" />Appointments</Link>
          <Link href="/dashboard/user/records" className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white/80 px-4 py-3 text-sm font-semibold text-slate-700 transition hover:border-teal-300 hover:text-teal-800"><DocumentTextIcon className="h-5 w-5" />Medical records</Link>
          <Link href="/dashboard/user/wallet" className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white/80 px-4 py-3 text-sm font-semibold text-slate-700 transition hover:border-teal-300 hover:text-teal-800"><WalletIcon className="h-5 w-5" />Wallet & billing</Link>
        </div>
      </header>

      {/* Patient Profile Card */}
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm lg:col-span-2 md:p-7">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-4">
              <div className="h-16 w-16 rounded-full bg-gradient-to-br from-teal-400 to-blue-600 flex items-center justify-center">
                <UserCircleIcon className="h-10 w-10 text-white" />
              </div>
              <div>
                <p className="text-lg font-semibold text-slate-900">{data.patient?.name ?? 'Patient'}</p>
                <p className="text-sm text-slate-500">{session.user.email}</p>
              </div>
            </div>
            <Link href="/dashboard/user/profile" className="rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 flex items-center gap-2 transition">
              <PencilIcon className="h-4 w-4" />
              Edit Profile
            </Link>
          </div>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-slate-500">Date of Birth</p>
              <p className="font-medium text-slate-900">{data.patient?.date_of_birth ? String(data.patient.date_of_birth) : 'Not set'}</p>
            </div>
            <div>
              <p className="text-slate-500">Patient ID</p>
              <p className="font-medium text-slate-900">{data.patient?.patient_number ?? `PT-${session.user.email?.split('@')[0].substring(0, 6).toUpperCase()}`}</p>
            </div>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm md:p-7">
          <h3 className="text-sm font-semibold text-slate-900 mb-4">Health Overview</h3>
          <div className="space-y-3">
            {data.careHighlights.map((item) => (
              <div key={item.label} className="flex items-start justify-between gap-3">
                <span><span className="block text-sm text-slate-700">{item.label}</span><span className="mt-0.5 block text-xs leading-5 text-slate-500">{item.detail}</span></span>
                <span className="shrink-0 font-semibold text-slate-900">{item.value}</span>
              </div>
            ))}
            <p className="border-t border-slate-100 pt-3 text-xs text-slate-400">Clinical records last updated {data.recordsUpdatedAt ? new Date(data.recordsUpdatedAt).toLocaleDateString() : 'when your care team shares an update'}.</p>
          </div>
        </div>
      </div>

      <PatientDashboardEnhancements
        appointments={[...data.upcomingAppointments, ...data.appointmentHistory]}
        records={data.medicalRecords}
        invoices={data.invoices}
        unreadNotifications={data.unreadNotifications}
        phone={data.patient?.phone}
        contactMethod={data.patient?.preferred_contact_method}
        needsProfileUpdate={!data.patient?.phone || !data.patient?.emergency_contact}
        requests={requests.map((item) => ({ id: String(item.id), type: String(item.request_type), message: String(item.message), status: String(item.status), response: item.response ? String(item.response) : null, createdAt: String(item.created_at), respondedAt: item.responded_at ? String(item.responded_at) : null }))}
      />

      <MedicationReminders reminders={medicationReminders.map((item) => ({ id: String(item.id), medication: String(item.medication_name), time: String(item.reminder_time), instructions: String(item.instructions ?? '') }))} />

      {/* Appointments Section */}
      <PatientAppointmentsSection appointments={data.upcomingAppointments} bookingOptions={data.bookingOptions} />

      {/* Wallet & Invoices Grid */}
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <PatientWalletSection walletSummary={data.walletSummary} transactions={data.walletTransactions} />
        </div>
        <div>
          <PatientInvoicesSection invoices={data.invoices} />
        </div>
      </div>

      {/* Support Section */}
      <PatientSupportSection supportChannels={data.supportChannels} />
    </main>
  );
}
