import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { fetchDoctorCatalogOptions, fetchDoctorScheduleBlocks, fetchDoctorStaffOptions, fetchStaffCalendar, fetchStaffQueue } from '@/app/lib/data';
import AdminScheduleControl from './admin-schedule-control';
import AdminAvailabilityControl from './admin-availability-control';
import { CancelScheduleBlockButton } from '@/app/dashboard/doctor/doctor-controls';

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

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
  return <main className="mx-auto w-full max-w-7xl space-y-6 pb-10"><header><p className="text-sm font-medium text-teal-700">Operations</p><h1 className="mt-1 text-2xl font-bold text-slate-900">Clinic calendar</h1><p className="mt-1 text-sm text-slate-500">Review upcoming visits and recurring doctor availability.{isAdmin ? ' Admins can also record schedule blocks for any doctor.' : ''}</p></header>
    {isAdmin && <><AdminScheduleControl doctors={doctors.map((doctor) => ({ name: String(doctor.name), email: String(doctor.email) }))} /><section className="space-y-3"><h2 className="text-lg font-semibold text-slate-900">Upcoming unavailable times</h2>{blocks.length ? <div className="space-y-2">{blocks.map((block) => <article key={block.id} className="flex flex-col gap-2 rounded-xl border border-amber-200 bg-amber-50 p-4 sm:flex-row sm:items-center sm:justify-between"><div className="min-w-0"><p className="break-words font-semibold text-amber-950">{block.doctor_name} · {String(block.block_date).slice(0, 10)} · {block.start_time}–{block.end_time}</p><p className="break-words text-sm text-amber-900">{block.reason}</p></div><CancelScheduleBlockButton id={String(block.id)} /></article>)}</div> : <p className="rounded-xl border border-dashed border-slate-300 bg-white p-5 text-sm text-slate-500">No upcoming schedule blocks recorded.</p>}</section></>}
    <section className="space-y-3"><div><h2 className="text-lg font-semibold text-slate-900">Upcoming appointment schedule</h2><p className="text-sm text-slate-500">Next visits sorted by date and appointment time.</p></div>{appointments.length ? <div className="space-y-2">{appointments.slice(0, 30).map((item) => <article key={item.id} className="flex flex-col gap-2 rounded-xl border border-slate-200 bg-white p-4 sm:flex-row sm:items-center sm:justify-between"><div className="min-w-0"><p className="break-words font-semibold text-slate-900">{String(item.appointment_date).slice(0, 10)} · {item.appointment_time} · {item.patient_name}</p><p className="break-words text-sm text-slate-600">{item.specialty} with {item.doctor_name}</p></div><span className="w-fit rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700">{item.check_in_status}</span></article>)}</div> : <p className="rounded-xl border border-dashed border-slate-300 bg-white p-5 text-sm text-slate-500">No upcoming appointments scheduled.</p>}</section>
    <section className="space-y-3"><div><h2 className="text-lg font-semibold text-slate-900">Recurring doctor availability</h2><p className="text-sm text-slate-500">Configured appointment slots by weekday.</p></div>{isAdmin ? <AdminAvailabilityControl doctors={doctorCatalog.map((doctor) => ({ id: String(doctor.id), name: String(doctor.name), specialty: String(doctor.specialty) }))} slots={slots.map((slot) => ({ doctor_id: String(slot.doctor_id), name: String(slot.name), specialty: String(slot.specialty), day_of_week: Number(slot.day_of_week), appointment_time: String(slot.appointment_time) }))} /> : <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">{slots.map((slot) => <article key={`${slot.name}-${slot.day_of_week}-${slot.appointment_time}`} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"><p className="font-semibold text-slate-900">{slot.name}</p><p className="text-xs text-slate-500">{slot.specialty}</p><p className="mt-3 text-sm text-teal-700">{DAYS[Number(slot.day_of_week)]}</p><p className="text-sm text-slate-600">{slot.appointment_time}</p></article>)}</div>}</section>
  </main>;
}
