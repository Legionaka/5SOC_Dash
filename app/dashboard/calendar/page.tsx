import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { CalendarDaysIcon, ClockIcon, ExclamationTriangleIcon, UserGroupIcon } from '@heroicons/react/24/outline';
import { fetchDoctorCatalogOptions, fetchDoctorScheduleBlocks, fetchDoctorStaffOptions, fetchStaffCalendar, fetchStaffQueue } from '@/app/lib/data';
import AdminScheduleControl from './admin-schedule-control';
import AdminAvailabilityControl from './admin-availability-control';
import { CancelScheduleBlockButton } from '@/app/dashboard/doctor/doctor-controls';

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

function formatDate(value: unknown) {
  const date = parseDate(value);
  return Number.isNaN(date.getTime()) ? String(value) : new Intl.DateTimeFormat('en-ZA', { weekday: 'short', day: 'numeric', month: 'short' }).format(date);
}

function formatMonth(value: unknown) {
  const date = parseDate(value);
  return Number.isNaN(date.getTime()) ? '—' : new Intl.DateTimeFormat('en-ZA', { month: 'short' }).format(date);
}

function parseDate(value: unknown) {
  const raw = String(value);
  const isoDate = raw.match(/^\d{4}-\d{2}-\d{2}/)?.[0];
  return new Date((isoDate ?? raw) + (isoDate ? 'T00:00:00' : ''));
}

function statusClass(status: string) {
  if (status.toLowerCase().includes('checked')) return 'bg-emerald-50 text-emerald-700 ring-emerald-600/20';
  if (status.toLowerCase().includes('waiting')) return 'bg-amber-50 text-amber-700 ring-amber-600/20';
  return 'bg-slate-100 text-slate-600 ring-slate-500/10';
}

export default async function CalendarPage() {
  const session = await auth();
  if (!session?.user.role || !['admin', 'doctor', 'nurse', 'pharmacy_reception'].includes(session.user.role)) redirect('/unauthorized');
  const isAdmin = session.user.role === 'admin';
  const [slots, appointments, blocks, doctors, doctorCatalog] = await Promise.all([
    fetchStaffCalendar(), fetchStaffQueue(),
    isAdmin && session.user.email ? fetchDoctorScheduleBlocks(session.user.email, true) : Promise.resolve([]),
    isAdmin ? fetchDoctorStaffOptions() : Promise.resolve([]),
    isAdmin ? fetchDoctorCatalogOptions() : Promise.resolve([]),
  ]);

  return <main className="mx-auto w-full max-w-7xl space-y-7 pb-12">
    <header className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#123f3c] via-[#176b63] to-[#2d8c7c] p-6 text-white shadow-xl shadow-teal-900/10 sm:p-8">
      <div className="relative z-10 max-w-2xl"><p className="text-sm font-semibold uppercase tracking-[0.18em] text-teal-100">Operations workspace</p><h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">Clinic calendar</h1><p className="mt-3 max-w-xl text-sm leading-6 text-teal-50/90">Keep appointments, doctor availability, and unavailable times organized in one clear view.</p></div>
      <CalendarDaysIcon className="absolute -bottom-12 -right-5 h-64 w-64 text-white/10" />
    </header>

    <section className="grid gap-3 sm:grid-cols-3" aria-label="Calendar summary">
      <SummaryCard icon={<CalendarDaysIcon className="h-5 w-5" />} label="Upcoming visits" value={appointments.length} tone="teal" />
      <SummaryCard icon={<ClockIcon className="h-5 w-5" />} label="Bookable slots" value={slots.length} tone="blue" />
      <SummaryCard icon={<ExclamationTriangleIcon className="h-5 w-5" />} label="Schedule blocks" value={blocks.length} tone="amber" />
    </section>

    {isAdmin && <section className="grid gap-5 xl:grid-cols-[1.1fr_0.9fr]"><AdminScheduleControl doctors={doctors.map((doctor) => ({ name: String(doctor.name), email: String(doctor.email) }))} /><section className="rounded-2xl border border-amber-200 bg-amber-50/70 p-5"><div className="flex items-start justify-between gap-3"><div><p className="text-xs font-semibold uppercase tracking-[0.16em] text-amber-700">Exceptions</p><h2 className="mt-1 text-lg font-bold text-amber-950">Unavailable times</h2></div><ExclamationTriangleIcon className="h-6 w-6 text-amber-600" /></div>{blocks.length ? <div className="mt-4 space-y-2">{blocks.map((block) => <article key={block.id} className="rounded-xl border border-amber-200 bg-white/80 p-3"><div className="flex items-start justify-between gap-3"><div className="min-w-0"><p className="break-words text-sm font-semibold text-slate-900">{block.doctor_name}</p><p className="mt-1 text-xs text-slate-600">{formatDate(block.block_date)} · {block.start_time} – {block.end_time}</p><p className="mt-2 break-words text-xs text-amber-900">{block.reason}</p></div><CancelScheduleBlockButton id={String(block.id)} /></div></article>)}</div> : <p className="mt-5 rounded-xl border border-dashed border-amber-300 bg-white/50 p-4 text-sm text-amber-900">No unavailable times recorded.</p>}</section></section>}

    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6"><div className="flex flex-col gap-2 border-b border-slate-100 pb-5 sm:flex-row sm:items-end sm:justify-between"><div><p className="text-xs font-semibold uppercase tracking-[0.16em] text-teal-700">Live schedule</p><h2 className="mt-1 text-xl font-bold text-slate-900">Upcoming appointments</h2><p className="mt-1 text-sm text-slate-500">The next 30 visits, ordered by date and time.</p></div><span className="w-fit rounded-full bg-teal-50 px-3 py-1 text-xs font-semibold text-teal-800">{appointments.length} scheduled</span></div>{appointments.length ? <div className="mt-5 grid gap-3 lg:grid-cols-2">{appointments.slice(0, 30).map((item) => <article key={item.id} className="group flex gap-4 rounded-xl border border-slate-200 p-4 transition hover:border-teal-300 hover:shadow-sm"><div className="flex h-12 w-12 shrink-0 flex-col items-center justify-center rounded-xl bg-teal-50 text-teal-800"><span className="text-[10px] font-bold uppercase">{formatMonth(item.appointment_date)}</span><span className="text-lg font-bold leading-5">{String(item.appointment_date).slice(8, 10) || '—'}</span></div><div className="min-w-0 flex-1"><div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between"><p className="break-words font-semibold text-slate-900">{item.patient_name}</p><span className={`w-fit rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset ${statusClass(String(item.check_in_status))}`}>{item.check_in_status}</span></div><p className="mt-1 break-words text-sm text-slate-600">{item.specialty} with {item.doctor_name}</p><p className="mt-2 flex items-center gap-1.5 text-xs font-medium text-slate-500"><ClockIcon className="h-3.5 w-3.5" />{item.appointment_time} · {formatDate(item.appointment_date)}</p></div></article>)}</div> : <EmptyState icon={<CalendarDaysIcon className="h-6 w-6" />} text="No upcoming appointments scheduled." />}</section>

    <section className="space-y-4"><div><p className="text-xs font-semibold uppercase tracking-[0.16em] text-teal-700">Booking setup</p><h2 className="mt-1 text-xl font-bold text-slate-900">Recurring doctor availability</h2><p className="mt-1 text-sm text-slate-500">Configure the weekly slots that patients can book.</p></div>{isAdmin ? <AdminAvailabilityControl doctors={doctorCatalog.map((doctor) => ({ id: String(doctor.id), name: String(doctor.name), specialty: String(doctor.specialty) }))} slots={slots.map((slot) => ({ doctor_id: String(slot.doctor_id), name: String(slot.name), specialty: String(slot.specialty), day_of_week: Number(slot.day_of_week), appointment_time: String(slot.appointment_time) }))} /> : <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">{slots.map((slot) => <article key={`${slot.name}-${slot.day_of_week}-${slot.appointment_time}`} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><div className="flex items-start justify-between gap-3"><div><p className="font-semibold text-slate-900">{slot.name}</p><p className="mt-1 text-xs text-slate-500">{slot.specialty}</p></div><UserGroupIcon className="h-5 w-5 text-teal-600" /></div><div className="mt-5 flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2.5"><span className="text-sm font-medium text-slate-700">{DAYS[Number(slot.day_of_week)]}</span><span className="text-sm font-semibold text-teal-800">{slot.appointment_time}</span></div></article>)}</div>}</section>
  </main>;
}

function SummaryCard({ icon, label, value, tone }: { icon: React.ReactNode; label: string; value: number; tone: 'teal' | 'blue' | 'amber' }) {
  const styles = { teal: 'bg-teal-50 text-teal-700', blue: 'bg-blue-50 text-blue-700', amber: 'bg-amber-50 text-amber-700' }[tone];
  return <article className="flex items-center gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"><span className={`flex h-11 w-11 items-center justify-center rounded-xl ${styles}`}>{icon}</span><div><p className="text-sm text-slate-500">{label}</p><p className="mt-0.5 text-2xl font-bold text-slate-900">{value}</p></div></article>;
}

function EmptyState({ icon, text }: { icon: React.ReactNode; text: string }) {
  return <div className="mt-5 flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-300 bg-slate-50/70 px-5 py-10 text-center"><span className="text-slate-400">{icon}</span><p className="mt-2 text-sm text-slate-500">{text}</p></div>;
}
