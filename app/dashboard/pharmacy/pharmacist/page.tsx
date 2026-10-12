import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { fetchPharmacyPrescriptions } from '@/app/lib/data';
import { PrescriptionStatusButton } from '@/app/dashboard/doctor/doctor-controls';

export default async function PharmacistDashboardPage() {
  const session = await auth();
  if (!session?.user.role || !['admin', 'pharmacist'].includes(session.user.role)) redirect('/unauthorized');
  const prescriptions = await fetchPharmacyPrescriptions();
  const pending = prescriptions.filter((item) => item.status === 'Pending verification').length;
  const dispensing = prescriptions.filter((item) => item.status === 'Dispensing').length;
  const stockWarnings = prescriptions.filter((item) => item.status === 'Dispensing' && Number(item.inventory_on_hand) < Number(item.quantity)).length;
  return <main className="mx-auto w-full max-w-7xl space-y-6 pb-10">
    <header className="rounded-3xl border border-teal-100 bg-gradient-to-br from-teal-50 via-white to-blue-50 p-5 shadow-sm sm:p-7"><p className="text-sm font-semibold uppercase tracking-[0.14em] text-teal-700">Pharmacy workspace</p><h1 className="mt-2 text-2xl font-bold text-slate-950 sm:text-3xl">Prescription verification & dispensing</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">Review the original order, check patient safety information, verify stock, and record each dispensing step.</p></header>
    <section className="grid gap-3 min-[520px]:grid-cols-3" aria-label="Prescription overview">{[{ label: 'Active orders', value: prescriptions.length }, { label: 'Awaiting verification', value: pending }, { label: 'Dispensing', value: dispensing }].map((item) => <article key={item.label} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5"><p className="text-sm font-medium text-slate-600">{item.label}</p><p className="mt-2 text-3xl font-bold text-slate-950">{item.value}</p></article>)}</section>
    {stockWarnings > 0 && <p className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm font-medium text-amber-950">{stockWarnings} dispensing order{stockWarnings === 1 ? '' : 's'} need more unexpired stock before completion.</p>}
    <section className="space-y-3"><div><h2 className="text-lg font-semibold text-slate-900">Active orders ({prescriptions.length})</h2><p className="text-sm text-slate-500">Dispensing consumes stock from the earliest-expiring eligible batch and adds an inventory audit entry.</p></div>
      {prescriptions.length ? prescriptions.map((item) => {
        const inventory = Number(item.inventory_on_hand ?? 0);
        const enoughStock = inventory >= Number(item.quantity);
        return <article key={item.id} className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between"><div className="min-w-0"><p className="break-words text-xs font-semibold text-teal-800">{item.patient_name}</p><p className="break-all text-xs text-slate-500">{item.patient_email}</p><h3 className="mt-2 break-words font-semibold text-slate-900">{item.medication_name} {item.strength}</h3></div><span className="w-fit rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-900">{item.status}</span></div>
          <p className="break-words text-sm text-slate-700">{item.directions} · Quantity {item.quantity} · Refills {item.refills}</p>
          <div className="grid gap-2 sm:grid-cols-3"><p className={`break-words rounded-lg p-3 text-sm ${item.active_allergies ? 'bg-rose-50 text-rose-900' : 'bg-slate-50 text-slate-600'}`}><strong>Active allergies:</strong> {item.active_allergies || 'None recorded'}</p><p className="break-words rounded-lg bg-slate-50 p-3 text-sm text-slate-700"><strong>Active medications:</strong> {item.active_medications || 'None recorded'}</p><p className={`rounded-lg p-3 text-sm ${enoughStock ? 'bg-emerald-50 text-emerald-900' : 'bg-amber-50 text-amber-950'}`}><strong>Unexpired stock:</strong> {inventory} units {enoughStock ? '' : `· ${Math.max(0, Number(item.quantity) - inventory)} short`}</p></div>
          <p className="break-words text-xs text-slate-500">Preferred pharmacy: {item.pharmacy || 'Not specified'} · Received {String(item.created_at)}</p>
          {item.pharmacist_note && <p className="break-words rounded-lg bg-slate-50 p-3 text-sm text-slate-700"><strong>Previous verification note:</strong> {item.pharmacist_note}</p>}
          {item.status !== 'Dispensing' || enoughStock ? <PrescriptionStatusButton id={String(item.id)} status={String(item.status)} inventoryAvailable={inventory} quantity={Number(item.quantity)} requireSafetyReview /> : <p className="text-sm font-medium text-amber-900">Restock this medication before marking the prescription dispensed.</p>}
        </article>;
      }) : <p className="rounded-xl border border-dashed border-slate-300 bg-white p-5 text-sm text-slate-500">No prescription orders need pharmacy action.</p>}
    </section>
  </main>;
}
