'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { addPharmacyInventoryItem, adjustPharmacyInventory } from '@/app/lib/pharmacy-actions';

export default function InventoryControls({ items }: { items: Array<{ id: string; medicine_name: string; strength: string; batch_number: string; expires_on: string | Date | null; low_stock: boolean; expired: boolean; expiring_soon: boolean; quantity: number; reorder_level: number }> }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [form, setForm] = useState({ medicineName: '', strength: '', batchNumber: '', quantity: '0', reorderLevel: '10', expiresOn: '' });
  async function add(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true);
    const result = await addPharmacyInventoryItem({ ...form, quantity: Number(form.quantity), reorderLevel: Number(form.reorderLevel) });
    setBusy(false); setMessage(result.message);
    if (result.success) { setForm({ medicineName: '', strength: '', batchNumber: '', quantity: '0', reorderLevel: '10', expiresOn: '' }); router.refresh(); }
  }
  async function adjust(event: React.FormEvent<HTMLFormElement>, id: string) {
    event.preventDefault(); const formElement = event.currentTarget; const data = new FormData(formElement);
    const quantityChange = Number(data.get('quantityChange')); const reorderLevel = Number(data.get('reorderLevel')); const reason = String(data.get('reason') ?? '');
    setBusy(true); const result = await adjustPharmacyInventory({ itemId: id, quantityChange, reorderLevel, reason }); setBusy(false); setMessage(result.message);
    if (result.success) { formElement.reset(); router.refresh(); }
  }
  return <>
    <form onSubmit={add} className="grid gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:grid-cols-2 sm:p-5">
      <div className="sm:col-span-2"><h2 className="font-semibold text-slate-900">Add medicine batch</h2><p className="mt-1 text-sm text-slate-500">Batch and expiry details keep stock traceable.</p></div>
      <label className="text-sm font-medium text-slate-700">Medicine<input required minLength={2} maxLength={160} value={form.medicineName} onChange={(e) => setForm({ ...form, medicineName: e.target.value })} className="mt-1 min-h-11 w-full rounded-lg border border-slate-300 px-3" /></label>
      <label className="text-sm font-medium text-slate-700">Strength / form<input maxLength={80} value={form.strength} onChange={(e) => setForm({ ...form, strength: e.target.value })} placeholder="500 mg tablets" className="mt-1 min-h-11 w-full rounded-lg border border-slate-300 px-3" /></label>
      <label className="text-sm font-medium text-slate-700">Batch / lot number<input required maxLength={100} value={form.batchNumber} onChange={(e) => setForm({ ...form, batchNumber: e.target.value })} className="mt-1 min-h-11 w-full rounded-lg border border-slate-300 px-3" /></label>
      <div className="grid grid-cols-2 gap-3"><label className="text-sm font-medium text-slate-700">Initial quantity<input type="number" min="0" max="100000" required value={form.quantity} onChange={(e) => setForm({ ...form, quantity: e.target.value })} className="mt-1 min-h-11 w-full rounded-lg border border-slate-300 px-3" /></label><label className="text-sm font-medium text-slate-700">Reorder level<input type="number" min="0" max="100000" required value={form.reorderLevel} onChange={(e) => setForm({ ...form, reorderLevel: e.target.value })} className="mt-1 min-h-11 w-full rounded-lg border border-slate-300 px-3" /></label></div>
      <label className="text-sm font-medium text-slate-700">Expiry date<input type="date" value={form.expiresOn} onChange={(e) => setForm({ ...form, expiresOn: e.target.value })} className="mt-1 min-h-11 w-full rounded-lg border border-slate-300 px-3" /></label>
      <div className="sm:col-span-2"><button disabled={busy} className="min-h-11 w-full rounded-lg bg-teal-700 px-4 text-sm font-semibold text-white disabled:opacity-50 sm:w-auto">{busy ? 'Saving…' : 'Add batch'}</button></div>
    </form>
    {message && <p role="status" className="rounded-lg bg-slate-100 p-3 text-sm text-slate-700">{message}</p>}
    <div className="space-y-3">{items.length ? items.map((item) => <article key={item.id} className="min-w-0 space-y-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
      <form onSubmit={(event) => adjust(event, item.id)} className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
        <div className="min-w-0"><div className="flex flex-wrap items-start justify-between gap-2"><div><h3 className="font-semibold text-slate-900">{item.medicine_name} {item.strength}</h3><p className="text-sm text-slate-500">Batch {item.batch_number} · Expires {item.expires_on ? String(item.expires_on).slice(0, 10) : 'not recorded'}</p></div><div className="flex flex-wrap gap-2">{item.low_stock && <span className="rounded-full bg-amber-100 px-2.5 py-1 text-xs font-semibold text-amber-900">Low stock</span>}{item.expired && <span className="rounded-full bg-rose-100 px-2.5 py-1 text-xs font-semibold text-rose-900">Expired · do not dispense</span>}{item.expiring_soon && !item.expired && <span className="rounded-full bg-orange-100 px-2.5 py-1 text-xs font-semibold text-orange-900">Expires within 90 days</span>}</div></div><p className="mt-2 text-2xl font-bold text-slate-950">{item.quantity}<span className="ml-2 text-sm font-medium text-slate-500">units on hand · reorder at {item.reorder_level}</span></p></div>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3"><label className="text-xs font-medium text-slate-600">Unit change (+/−)<input name="quantityChange" required type="number" min="-100000" max="100000" defaultValue="0" className="mt-1 min-h-11 w-full rounded-lg border border-slate-300 px-2 text-sm" /></label><label className="text-xs font-medium text-slate-600">Reorder level<input name="reorderLevel" required type="number" min="0" max="100000" defaultValue={item.reorder_level} className="mt-1 min-h-11 w-full rounded-lg border border-slate-300 px-2 text-sm" /></label><label className="col-span-2 text-xs font-medium text-slate-600 sm:col-span-1">Reason<input name="reason" required minLength={3} maxLength={240} placeholder="Receipt, damage, count correction…" className="mt-1 min-h-11 w-full rounded-lg border border-slate-300 px-2 text-sm" /></label><button disabled={busy} className="col-span-2 min-h-11 rounded-lg border border-teal-200 px-3 text-sm font-semibold text-teal-800 disabled:opacity-50 sm:col-span-3">Save inventory update</button></div>
      </form>
    </article>) : <p className="rounded-xl border border-dashed border-slate-300 bg-white p-6 text-sm text-slate-600">No inventory batches yet. Add the first batch above.</p>}</div>
  </>;
}
