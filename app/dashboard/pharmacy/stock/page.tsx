import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { fetchPharmacyInventory, fetchPharmacyInventoryHistory } from '@/app/lib/data';
import InventoryControls from './inventory-controls';

export default async function PharmacyStockPage() {
  const session = await auth();
  if (!session?.user.role || !['admin', 'pharmacy_stocker'].includes(session.user.role)) redirect('/unauthorized');
  const [inventory, history] = await Promise.all([fetchPharmacyInventory(), fetchPharmacyInventoryHistory()]);
  const lowStock = inventory.filter((item) => item.low_stock).length;
  const expiring = inventory.filter((item) => item.expiring_soon).length;
  const expired = inventory.filter((item) => item.expired).length;
  return <main className="mx-auto w-full max-w-7xl space-y-6 pb-10">
    <header className="rounded-3xl border border-teal-100 bg-gradient-to-br from-teal-50 via-white to-blue-50 p-5 shadow-sm sm:p-7"><p className="text-sm font-semibold uppercase tracking-[0.14em] text-teal-700">Pharmacy inventory</p><h1 className="mt-2 text-2xl font-bold text-slate-950 sm:text-3xl">Stock workspace</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">Track medicine batches, expiry dates, reorder thresholds, and auditable stock changes.</p></header>
    <section className="grid gap-3 min-[520px]:grid-cols-2 xl:grid-cols-4" aria-label="Inventory summary">{[{ label: 'Medicine batches', value: inventory.length }, { label: 'At or below reorder level', value: lowStock }, { label: 'Expiring within 90 days', value: expiring }, { label: 'Expired batches', value: expired }].map((item) => <article key={item.label} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5"><p className="text-sm font-medium text-slate-600">{item.label}</p><p className="mt-2 text-3xl font-bold text-slate-950">{item.value}</p></article>)}</section>
    <InventoryControls items={inventory.map((item) => ({ id: String(item.id), medicine_name: String(item.medicine_name), strength: String(item.strength), batch_number: String(item.batch_number), expires_on: item.expires_on as string | Date | null, low_stock: Boolean(item.low_stock), expired: Boolean(item.expired), expiring_soon: Boolean(item.expiring_soon), quantity: Number(item.quantity), reorder_level: Number(item.reorder_level) }))} />
    <section className="space-y-3"><div><h2 className="text-lg font-semibold text-slate-900">Recent stock activity</h2><p className="text-sm text-slate-500">The latest recorded receipts and adjustments.</p></div>{history.length ? <div className="space-y-2">{history.map((item) => <article key={item.id} className="flex flex-col gap-1 rounded-xl border border-slate-200 bg-white p-4 sm:flex-row sm:items-center sm:justify-between"><div className="min-w-0"><p className="break-words text-sm font-semibold text-slate-900">{item.medicine_name} {item.strength} · batch {item.batch_number}</p><p className="break-words text-sm text-slate-600">{item.reason}</p><p className="break-all text-xs text-slate-400">{item.actor_email} · {String(item.created_at)}</p></div><span className={`w-fit rounded-full px-2.5 py-1 text-sm font-semibold ${Number(item.quantity_change) < 0 ? 'bg-amber-50 text-amber-900' : 'bg-emerald-50 text-emerald-900'}`}>{Number(item.quantity_change) > 0 ? '+' : ''}{item.quantity_change} units</span></article>)}</div> : <p className="rounded-xl border border-dashed border-slate-300 bg-white p-5 text-sm text-slate-500">Stock activity will appear here as batches are added or adjusted.</p>}</section>
  </main>;
}
