import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { fetchReceptionInvoices, fetchStaffQueue } from '@/app/lib/data';
import { formatCurrency } from '@/app/lib/utils';
import { ReceptionCheckIn, RecordCashPayment } from './reception-controls';

export default async function PharmacyReceptionPage() {
  const session = await auth();
  if (!session?.user.role || !['admin', 'pharmacy_reception'].includes(session.user.role)) redirect('/unauthorized');
  const [queue, invoices] = await Promise.all([fetchStaffQueue(), fetchReceptionInvoices()]);
  const checkedIn = queue.filter((item) => item.check_in_status === 'Checked in' || item.check_in_status === 'In consultation').length;
  return <main className="mx-auto w-full max-w-7xl space-y-6 pb-10">
    <header className="rounded-3xl border border-teal-100 bg-gradient-to-br from-teal-50 via-white to-blue-50 p-5 shadow-sm sm:p-7"><p className="text-sm font-semibold uppercase tracking-[0.14em] text-teal-700">Front desk</p><h1 className="mt-2 text-2xl font-bold text-slate-950 sm:text-3xl">Reception workspace</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">Coordinate arrivals, update patient check-in, and record payments collected at the clinic.</p></header>
    <section className="grid gap-3 min-[520px]:grid-cols-3" aria-label="Reception summary">
      {[{ label: 'Upcoming appointments', value: queue.length }, { label: 'Checked in', value: checkedIn }, { label: 'Invoices awaiting payment', value: invoices.length }].map((item) => <article key={item.label} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5"><p className="text-sm font-medium text-slate-600">{item.label}</p><p className="mt-2 text-3xl font-bold text-slate-950">{item.value}</p></article>)}
    </section>
    <section className="space-y-3"><div><h2 className="text-lg font-semibold text-slate-900">Appointment arrivals</h2><p className="text-sm text-slate-500">Check in a patient when they arrive. Clinical status changes are handled by the care team.</p></div>
      {queue.length ? <div className="space-y-3">{queue.map((item) => <article key={item.id} className="flex min-w-0 flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between sm:p-5"><div className="min-w-0"><h3 className="break-words font-semibold text-slate-900">{item.patient_name}</h3><p className="break-all text-sm text-slate-500">{item.patient_email}</p><p className="mt-2 break-words text-sm text-slate-700">{item.specialty} · {item.reason}</p><p className="mt-1 text-sm text-slate-500">{String(item.appointment_date).slice(0, 10)} · {item.appointment_time} · {item.doctor_name}</p></div><ReceptionCheckIn id={String(item.id)} initialStatus={String(item.check_in_status ?? 'Not checked in')} /></article>)}</div> : <p className="rounded-xl border border-dashed border-slate-300 bg-white p-5 text-sm text-slate-500">No upcoming appointments need reception follow-up.</p>}
    </section>
    <section className="space-y-3"><div><h2 className="text-lg font-semibold text-slate-900">In-person payments</h2><p className="text-sm text-slate-500">Confirm that funds were collected before recording an invoice as paid. Each payment is added to the patient transaction history.</p></div>
      {invoices.length ? <div className="grid gap-3 md:grid-cols-2">{invoices.map((invoice) => <article key={invoice.id} className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5"><div className="flex flex-wrap items-start justify-between gap-2"><div className="min-w-0"><h3 className="break-words font-semibold text-slate-900">{invoice.patient_name}</h3><p className="break-all text-sm text-slate-500">{invoice.patient_email}</p><p className="mt-1 text-xs text-slate-500">Invoice date {String(invoice.date).slice(0, 10)}</p></div><p className="text-lg font-bold text-slate-950">{formatCurrency(Number(invoice.amount))}</p></div><RecordCashPayment invoiceId={String(invoice.id)} /></article>)}</div> : <p className="rounded-xl border border-dashed border-slate-300 bg-white p-5 text-sm text-slate-500">No pending invoices are ready for in-person payment.</p>}
    </section>
  </main>;
}
