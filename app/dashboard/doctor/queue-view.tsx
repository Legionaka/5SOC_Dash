'use client';

import Link from 'next/link';
import { CheckInControl } from './doctor-controls';

type QueueItem = {
  id: string;
  patientEmail: string;
  patientName: string;
  doctor: string;
  specialty: string;
  date: string;
  time: string;
  reason: string;
  status: string;
  checkInStatus: string;
};

export default function DoctorQueueView({ appointments, canOpenCharts = true, limitedCheckIn = false }: { appointments: QueueItem[]; canOpenCharts?: boolean; limitedCheckIn?: boolean }) {
  if (appointments.length === 0) return <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-6 text-sm text-slate-600">No upcoming appointments are assigned in the next 7 days.</div>;
  return <div className="space-y-3">{appointments.map((item) => (
    <article key={item.id} className="min-w-0 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          {canOpenCharts ? <Link href={`/dashboard/doctor/patients/${encodeURIComponent(item.patientEmail)}`} className="break-words font-semibold text-slate-900 hover:text-teal-800">{item.patientName}</Link> : <p className="break-words font-semibold text-slate-900">{item.patientName}</p>}
          <p className="break-all text-sm text-slate-500">{item.patientEmail}</p>
          <p className="mt-2 text-sm text-slate-700">{item.specialty} · {item.reason}</p>
        </div>
        <div className="flex flex-wrap gap-2 text-xs">
          <span className="rounded-full bg-sky-50 px-2.5 py-1 font-medium text-sky-800">{item.status}</span>
          <span className="rounded-full bg-amber-50 px-2.5 py-1 font-medium text-amber-800">{item.date} · {item.time}</span>
        </div>
      </div>
      <div className="mt-4 flex flex-col gap-2 border-t border-slate-100 pt-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Patient check-in</p>
        <CheckInControl appointmentId={item.id} value={item.checkInStatus} limited={limitedCheckIn} />
      </div>
    </article>
  ))}</div>;
}
