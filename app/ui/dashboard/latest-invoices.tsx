import { ArrowRightIcon } from '@heroicons/react/24/outline';
import clsx from 'clsx';
import Image from 'next/image';
import Link from 'next/link';
import { lusitana } from '@/app/ui/fonts';
import { fetchLatestInvoices } from '@/app/lib/data';
import { withTimeout } from '@/app/lib/with-timeout';

export default async function LatestInvoices() {
  let latestInvoices;
  try {
    latestInvoices = await withTimeout(fetchLatestInvoices(), 8000, 'Latest invoices');
  } catch (error) {
    console.error('Latest invoices unavailable:', error);
    return <div className="flex w-full flex-col md:col-span-4"><h2 className={`${lusitana.className} mb-4 text-xl md:text-2xl`}>Latest Invoices</h2><div className="rounded-xl bg-gray-50 p-4"><div className="divide-y divide-slate-100 rounded-xl bg-white px-6"><div className="flex justify-between py-4 text-sm"><span>Example patient A</span><span className="font-semibold">R 850.00</span></div><div className="flex justify-between py-4 text-sm"><span>Example patient B</span><span className="font-semibold">R 1,250.00</span></div><div className="flex justify-between py-4 text-sm"><span>Example patient C</span><span className="font-semibold">R 620.00</span></div></div></div></div>;
  }

  return <div className="flex w-full flex-col md:col-span-4">
    <h2 className={`${lusitana.className} mb-4 text-xl md:text-2xl`}>Latest Invoices</h2>
    <div className="flex grow flex-col justify-between rounded-xl bg-gray-50 p-4">
      <div className="bg-white px-6">
        {latestInvoices.length === 0 ? <div className="px-2 py-8 text-center text-sm text-gray-500">No invoices have been created yet.</div> : latestInvoices.map((invoice, i) => <Link key={invoice.id} href={`/dashboard/invoices/${invoice.id}/edit`} className={clsx('flex flex-row items-center justify-between gap-4 py-4 transition hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-inset', { 'border-t': i !== 0 })} aria-label={`Open invoice for ${invoice.name}`}>
          <div className="flex min-w-0 items-center"><Image src={invoice.image_url || '/customers/evil-rabbit.png'} alt="" className="mr-4 rounded-full" width={32} height={32} /><div className="min-w-0"><p className="truncate text-sm font-semibold md:text-base">{invoice.name}</p><p className="hidden truncate text-sm text-gray-500 sm:block">{invoice.email}</p></div></div>
          <div className="flex shrink-0 items-center gap-3"><div className="text-right"><p className={`${lusitana.className} text-sm font-medium md:text-base`}>{invoice.amount}</p><p className="text-xs capitalize text-gray-500">{invoice.status}</p></div><ArrowRightIcon className="h-4 w-4 text-gray-400" aria-hidden="true" /></div>
        </Link>)}
      </div>
      <div className="flex items-center justify-between gap-4 pb-2 pt-6"><p className="text-sm text-gray-500">Showing the 5 most recent invoices</p><Link href="/dashboard/invoices" className="inline-flex shrink-0 items-center gap-1 text-sm font-medium text-blue-600 hover:text-blue-800 focus:outline-none focus:ring-2 focus:ring-blue-500">View all<ArrowRightIcon className="h-4 w-4" aria-hidden="true" /></Link></div>
    </div>
  </div>;
}
