import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { fetchPatientDashboardData } from '@/app/lib/data';
import { ArrowDownTrayIcon } from '@heroicons/react/24/outline';

export default async function PatientInvoicesPage() {
  const session = await auth();
  if (session?.user.role !== 'patient' || !session.user.email) redirect('/unauthorized');
  const data = await fetchPatientDashboardData(session.user.email);

  return (
    <main className="mx-auto w-full max-w-5xl space-y-6">
      <div>
        <p className="text-sm font-medium text-teal-700">Billing & account</p>
        <h1 className="mt-1 text-2xl font-bold text-slate-900">Invoices</h1>
        <p className="mt-1 text-sm text-slate-500">Review your clinic billing history and payment status.</p>
      </div>
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        {data.invoices.length === 0 ? (
          <p className="p-8 text-sm text-slate-500">No invoices are available yet.</p>
        ) : (
          <div className="divide-y divide-slate-100">
            {data.invoices.map((invoice) => (
              <div key={invoice.id} className="flex flex-col gap-2 p-5 sm:flex-row sm:items-center sm:justify-between">
                <div><p className="font-semibold text-slate-900">INV-{invoice.id.substring(0, 8)}</p><p className="text-sm text-slate-500">Issued {invoice.createdDate}</p></div>
                <div className="flex items-center gap-3"><span className="font-semibold text-slate-900">{invoice.amount}</span><span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700">{invoice.status}</span><a href={`/api/invoices/${invoice.id}/pdf`} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-2.5 py-2 text-xs font-semibold text-slate-600 hover:border-teal-300 hover:text-teal-700"><ArrowDownTrayIcon className="h-4 w-4" /><span>PDF</span></a></div>
              </div>
            ))}
          </div>
        )}
      </div>
      <Link href="/dashboard/user/wallet" className="inline-flex rounded-lg bg-teal-700 px-4 py-2 text-sm font-medium text-white hover:bg-teal-800">Open wallet</Link>
    </main>
  );
}
