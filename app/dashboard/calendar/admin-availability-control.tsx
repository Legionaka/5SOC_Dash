'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { addDoctorAvailabilitySlot, removeDoctorAvailabilitySlot } from '@/app/lib/admin-actions';

type Doctor = { id: string; name: string; specialty: string };
type Slot = { doctor_id: string; name: string; specialty: string; day_of_week: number; appointment_time: string };
const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const TIMES = Array.from({ length: 24 }, (_, index) => {
  const hour24 = 8 + index / 2;
  const hour = hour24 % 12 || 12;
  const minute = index % 2 ? '30' : '00';
  return `${String(hour).padStart(2, '0')}:${minute} ${hour24 < 12 ? 'AM' : 'PM'}`;
});

export default function AdminAvailabilityControl({ doctors, slots }: { doctors: Doctor[]; slots: Slot[] }) {
  const router = useRouter();
  const [doctorId, setDoctorId] = useState(doctors[0]?.id ?? '');
  const [dayOfWeek, setDayOfWeek] = useState('1');
  const [appointmentTime, setAppointmentTime] = useState('09:00 AM');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  async function add(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true);
    const result = await addDoctorAvailabilitySlot({ doctorId, dayOfWeek: Number(dayOfWeek), appointmentTime });
    setBusy(false); setMessage(result.message); if (result.success) router.refresh();
  }
  async function remove(slot: Slot) {
    setBusy(true);
    const result = await removeDoctorAvailabilitySlot({ doctorId: slot.doctor_id, dayOfWeek: Number(slot.day_of_week), appointmentTime: slot.appointment_time });
    setBusy(false); setMessage(result.message); if (result.success) router.refresh();
  }
  return <>
    <form onSubmit={add} className="grid gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:grid-cols-3 sm:p-5">
      <div className="sm:col-span-3"><h2 className="font-semibold text-slate-900">Manage recurring availability</h2><p className="mt-1 text-sm text-slate-500">Add bookable doctor slots for patients. Existing appointments are retained if a slot is removed.</p></div>
      <label className="text-sm font-medium text-slate-700">Doctor<select required value={doctorId} onChange={(event) => setDoctorId(event.target.value)} className="mt-1 min-h-11 w-full rounded-lg border border-slate-300 bg-white px-3"><option value="">Select doctor</option>{doctors.map((doctor) => <option key={doctor.id} value={doctor.id}>{doctor.name} · {doctor.specialty}</option>)}</select></label>
      <label className="text-sm font-medium text-slate-700">Weekday<select value={dayOfWeek} onChange={(event) => setDayOfWeek(event.target.value)} className="mt-1 min-h-11 w-full rounded-lg border border-slate-300 bg-white px-3">{DAYS.map((day, index) => <option key={day} value={index}>{day}</option>)}</select></label>
      <label className="text-sm font-medium text-slate-700">Appointment time<select value={appointmentTime} onChange={(event) => setAppointmentTime(event.target.value)} className="mt-1 min-h-11 w-full rounded-lg border border-slate-300 bg-white px-3">{TIMES.map((time) => <option key={time}>{time}</option>)}</select></label>
      <div className="sm:col-span-3"><button disabled={busy || !doctors.length} className="min-h-11 w-full rounded-lg bg-teal-700 px-4 text-sm font-semibold text-white disabled:opacity-50 sm:w-auto">{busy ? 'Saving…' : 'Add bookable slot'}</button>{message && <p role="status" className="mt-2 text-sm text-slate-600">{message}</p>}</div>
    </form>
    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">{slots.map((slot) => <article key={`${slot.doctor_id}-${slot.day_of_week}-${slot.appointment_time}`} className="flex min-w-0 flex-col justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"><div><p className="break-words font-semibold text-slate-900">{slot.name}</p><p className="text-xs text-slate-500">{slot.specialty}</p><p className="mt-3 text-sm font-medium text-teal-800">{DAYS[Number(slot.day_of_week)]} · {slot.appointment_time}</p></div><button type="button" onClick={() => remove(slot)} disabled={busy} className="min-h-11 w-full rounded-lg border border-rose-200 px-3 text-sm font-medium text-rose-700 disabled:opacity-50">Remove slot</button></article>)}{!slots.length && <p className="rounded-xl border border-dashed border-slate-300 bg-white p-5 text-sm text-slate-500">No recurring doctor availability is configured.</p>}</div>
  </>;
}
