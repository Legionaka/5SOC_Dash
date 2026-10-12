import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { fetchStaffCalendar } from '@/app/lib/data';

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export default async function CalendarPage() {
  const session = await auth();
  if (!session?.user.role || !['admin', 'doctor', 'nurse', 'pharmacy_reception'].includes(session.user.role)) redirect('/unauthorized');
  const slots = await fetchStaffCalendar();
  return <main className="space-y-6"><div><p className="text-sm font-medium text-teal-700">Operations</p><h1 className="mt-1 text-2xl font-bold text-slate-900">Doctor calendar</h1><p className="mt-1 text-sm text-slate-500">Configured recurring availability. Shift blocks and leave controls are the next operational layer.</p></div><div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{slots.map((slot) => <article key={`${slot.name}-${slot.day_of_week}-${slot.appointment_time}`} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"><p className="font-semibold text-slate-900">{slot.name}</p><p className="text-xs text-slate-500">{slot.specialty}</p><p className="mt-3 text-sm text-teal-700">{DAYS[Number(slot.day_of_week)]}</p><p className="text-sm text-slate-600">{slot.appointment_time}</p></article>)}</div></main>;
}
