import { auth } from '@/auth';
import { lusitana } from '@/app/ui/fonts';
import { redirect } from 'next/navigation';
import { TEST_PATIENT_EMAIL } from '@/app/lib/access-control';

export default async function PatientDashboardPage() {
  const session = await auth();
  const isPatient = session?.user.role === 'patient';
  const isTestPatient = session?.user.email === TEST_PATIENT_EMAIL;
  // #region agent log
  fetch('http://127.0.0.1:7826/ingest/f67fa5db-0508-44bf-803c-d13bfd7999ec',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'7d5deb'},body:JSON.stringify({sessionId:'7d5deb',runId:'pre-fix',hypothesisId:'E',location:'app/dashboard/user/page.tsx:PatientDashboardPage',message:'patient page entry',data:{hasSession:!!session?.user,isPatient,isTestPatient,role:session?.user.role??null},timestamp:Date.now()})}).catch(()=>{});
  // #endregion
  if (!isPatient || !isTestPatient) {
    redirect('/unauthorized');
  }

  return (
    <main className="mx-auto w-full max-w-7xl space-y-8 pb-12">
      {/* Header */}
      <header className="border-b border-slate-200 pb-6">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-sm font-medium text-teal-700">Patient Portal</p>
            <h1
              className={`${lusitana.className} mt-2 text-2xl font-bold text-slate-900 md:text-3xl`}
            >
              Welcome back, {data.patient?.name ?? 'Patient'}
            </h1>
          </div>
          <div className="inline-flex items-center gap-2 rounded-full border border-teal-200 bg-teal-50 px-3 py-1.5 text-sm text-teal-800">
            <BellAlertIcon className="h-4 w-4" />
            {data.unreadNotifications} notifications
          </div>
        </div>
      </header>

      {/* Patient Profile Card */}
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm lg:col-span-2">
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
            <button className="rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 flex items-center gap-2 transition">
              <PencilIcon className="h-4 w-4" />
              Edit Profile
            </button>
          </div>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-slate-500">Date of Birth</p>
              <p className="font-medium text-slate-900">Not set</p>
            </div>
            <div>
              <p className="text-slate-500">Patient ID</p>
              <p className="font-medium text-slate-900">PT-{session.user.email?.split('@')[0].substring(0, 6).toUpperCase()}</p>
            </div>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h3 className="text-sm font-semibold text-slate-900 mb-4">Health Overview</h3>
          <div className="space-y-3">
            {data.careHighlights.map((item) => (
              <div key={item.label} className="flex items-center justify-between">
                <span className="text-sm text-slate-600">{item.label}</span>
                <span className="font-semibold text-slate-900">{item.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Appointments Section */}
      <PatientAppointmentsSection appointments={data.upcomingAppointments} />

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
      <PatientSupportSection supportOptions={data.supportOptions} />
    </main>
  );
}
