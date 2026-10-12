import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { fetchPatientDashboardData } from '@/app/lib/data';
import { PatientWalletSection } from '../client-components';

export default async function PatientWalletPage() {
  const session = await auth();
  if (session?.user.role !== 'patient' || !session.user.email) redirect('/unauthorized');
  const data = await fetchPatientDashboardData(session.user.email);
  return <main className="space-y-6"><div><p className="text-sm font-medium text-teal-700">Billing & account</p><h1 className="mt-1 text-2xl font-bold text-slate-900">Wallet</h1></div><div className="max-w-3xl"><PatientWalletSection walletSummary={data.walletSummary} transactions={data.walletTransactions} /></div></main>;
}
