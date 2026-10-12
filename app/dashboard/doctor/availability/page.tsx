import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { fetchDoctorScheduleBlocks, fetchStaffCalendar } from '@/app/lib/data';
import { CancelScheduleBlockButton, ScheduleBlockForm } from '../doctor-controls';

export default async function DoctorAvailabilityPage() {
  const session = await auth();
  if (!session?.user.email || !session.user.role || !['admin', 'doctor'].includes(session.user.role)) redirect('/unauthorized');
  const [calendar, blocks] = await Promise.all([fetchStaffCalendar(), fetchDoctorScheduleBlocks(session.user.email, session.user.role === 'admin')]);
  return <main className="mx-auto w-full max-w-7xl space-y-6 pb-10">
    <header><p className="text-sm font-medium text-teal-700">Clinical workspace</p><h1 className="mt-1 text-2xl font-bold text-slate-900">Schedule & availability</h1><p className="mt-1 text-sm text-slate-500">Review configured recurring appointment slots and record dates or times when appointments should not be booked.</p></header>
    <ScheduleBlockForm />
    <section className="space-y-3"><h2 className="text-lg font-semibold text-slate-900">Upcoming unavailable times</h2>{blocks.length ? <div className="space-y-2">{blocks.map((block) => <article key={block.id} className="flex flex-col gap-2 rounded-xl border border-amber-200 bg-amber-50 p-4 sm:flex-row sm:items-center sm:justify-between"><div className="min-w-0"><p className="font-semibold text-amber-950">{String(block.doctor_name)} · {String(block.block_date)} · {String(block.start_time)}–{String(block.end_time)}</p><p className="break-words text-sm text-amber-900">{block.reason}</p></div><CancelScheduleBlockButton id={String(block.id)} /></article>)}</div> : <p className="rounded-xl border border-dashed border-slate-300 bg-white p-5 text-sm text-slate-500">No upcoming blocks recorded.</p>}</section>
    <section className="space-y-3"><h2 className="text-lg font-semibold text-slate-900">Recurring appointment slots</h2><div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{calendar.map((slot, index) => <article key={`${slot.name}-${slot.day_of_week}-${slot.appointment_time}-${index}`} className="rounded-xl border border-slate-200 bg-white p-4"><p className="font-semibold text-slate-900">{slot.name}</p><p className="mt-1 text-sm text-slate-600">{slot.specialty}</p><p className="mt-2 text-sm text-teal-800">{slot.day_of_week} · {slot.appointment_time}</p></article>)}</div></section>
  </main>;
}
