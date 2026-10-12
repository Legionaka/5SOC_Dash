import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { fetchNursePatientRequests, fetchNurseQueue } from '@/app/lib/data';
import { NurseCheckInControl, NurseTriageForm } from './nurse-controls';
import NurseRequests from './nurse-requests';

export default async function NurseDashboardPage() {
  const session = await auth();
  if (!session?.user.role || !['admin', 'nurse'].includes(session.user.role)) redirect('/unauthorized');
  const [appointments, openRequests] = await Promise.all([fetchNurseQueue(), fetchNursePatientRequests()]);
  const waiting = appointments.filter((item) => item.check_in_status === 'Not checked in').length;
  const checkedIn = appointments.filter((item) => item.check_in_status === 'Checked in').length;
  const triagePending = appointments.filter((item) => item.triage_status !== 'Submitted' && item.check_in_status !== 'In consultation').length;
  return <main className="mx-auto w-full max-w-7xl space-y-6 pb-10">
    <header className="rounded-3xl border border-teal-100 bg-gradient-to-br from-teal-50 via-white to-blue-50 p-5 shadow-sm sm:p-7"><p className="text-sm font-semibold uppercase tracking-[0.14em] text-teal-700">Nursing workspace</p><h1 className="mt-2 text-2xl font-bold text-slate-950 sm:text-3xl">Triage & patient intake</h1><p className="mt-2 text-sm leading-6 text-slate-600">Today’s appointments, check-in status, initial complaints, and intake observations.</p></header>
    <section className="grid gap-3 min-[520px]:grid-cols-2 xl:grid-cols-4" aria-label="Nursing overview">{[{ label: "Today's appointments", value: appointments.length }, { label: 'Waiting to check in', value: waiting }, { label: 'Triage still needed', value: triagePending }, { label: 'Open patient messages', value: openRequests.length }].map((item) => <article key={item.label} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5"><p className="text-sm font-medium text-slate-600">{item.label}</p><p className="mt-2 text-3xl font-bold text-slate-950">{item.value}</p></article>)}</section>
    <section className="space-y-3"><div><h2 className="text-lg font-semibold text-slate-900">Today’s intake queue</h2><p className="text-sm text-slate-500">Submitted triage can be updated until the doctor starts the consultation ({checkedIn} currently checked in).</p></div>
      {appointments.length ? <div className="space-y-3">{appointments.map((item) => {
        const locked = item.check_in_status === 'In consultation';
        return <article key={item.id} className="min-w-0 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5"><div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between"><div className="min-w-0"><h3 className="break-words font-semibold text-slate-900">{item.patient_name}</h3><p className="break-all text-sm text-slate-500">{item.patient_email}</p><p className="mt-2 break-words text-sm text-slate-700">{item.specialty} · {item.reason}</p><p className="mt-1 text-sm text-slate-500">{item.appointment_time} · {item.doctor_name}</p></div><span className="w-fit rounded-full bg-sky-50 px-2.5 py-1 text-xs font-medium text-sky-800">{item.status}</span></div>
          <div className="mt-4 flex flex-col gap-2 border-t border-slate-100 pt-3 sm:flex-row sm:items-center sm:justify-between"><p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Check-in</p><NurseCheckInControl appointmentId={String(item.id)} initialStatus={String(item.check_in_status ?? 'Not checked in')} /></div>
          <NurseTriageForm initial={{ appointmentId: String(item.id), patientEmail: String(item.patient_email), bloodPressure: String(item.blood_pressure ?? ''), pulse: item.pulse == null ? '' : String(item.pulse), temperatureC: item.temperature_c == null ? '' : String(item.temperature_c), weightKg: item.weight_kg == null ? '' : String(item.weight_kg), heightCm: item.height_cm == null ? '' : String(item.height_cm), initialComplaint: String(item.initial_complaint ?? ''), status: locked ? 'Locked' : String(item.triage_status ?? 'Draft') }} />
          {item.triage_updated_at && <p className="mt-2 text-xs text-slate-400">Last triage update: {String(item.triage_updated_at)}</p>}
        </article>;
      })}</div> : <p className="rounded-2xl border border-dashed border-slate-300 bg-white p-6 text-sm text-slate-600">No appointments are scheduled for today.</p>}
    </section>
    <NurseRequests requests={openRequests.map((item) => ({ id: String(item.id), patient: String(item.patient_name), email: String(item.patient_email), type: String(item.request_type), message: String(item.message), createdAt: String(item.created_at) }))} />
  </main>;
}
