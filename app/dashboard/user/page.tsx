import { auth } from '@/auth';
import { lusitana } from '@/app/ui/fonts';
import { redirect } from 'next/navigation';
import { TEST_PATIENT_EMAIL } from '@/app/lib/access-control';
import { probePatientDashboardData } from '@/app/lib/data';

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

  const probe = await probePatientDashboardData(Boolean(session.user.email));
  // #region agent log
  fetch('http://127.0.0.1:7826/ingest/f67fa5db-0508-44bf-803c-d13bfd7999ec',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'7d5deb'},body:JSON.stringify({sessionId:'7d5deb',runId:'pre-fix',hypothesisId:'A',location:'app/dashboard/user/page.tsx:afterProbe',message:'probe complete',data:{invoicesAmount:probe.invoicesAmount,usersAmount:probe.usersAmount,customersAmount:probe.customersAmount,unqualifiedJoin:probe.unqualifiedJoin,invoiceHasAmount:probe.invoiceColumns.includes('amount'),userHasAmount:probe.userColumns.includes('amount'),customerHasAmount:probe.customerColumns.includes('amount')},timestamp:Date.now()})}).catch(()=>{});
  // #endregion

  return (
    <main className="mx-auto w-full max-w-5xl">
      <header className="border-b border-slate-200 pb-6">
        <p className="text-sm font-medium text-teal-700">Patient Portal</p>
        <h1
          className={`${lusitana.className} mt-2 text-2xl font-bold text-slate-900 md:text-3xl`}
        >
          Welcome, {session.user.name ?? 'Patient'}
        </h1>
      </header>
    </main>
  );
}
