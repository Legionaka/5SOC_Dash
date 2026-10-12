import Link from 'next/link';
import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { fetchDoctorPatients } from '@/app/lib/data';

export default async function DoctorPatientsPage() {
  const session = await auth();
  if (!session?.user.email || !session.user.role || !['admin', 'doctor'].includes(session.user.role)) redirect('/unauthorized');
  const patients = await fetchDoctorPatients(session.user.name ?? '', session.user.role === 'admin');
  return (
    <main className="mx-auto w-full max-w-7xl space-y-5 sm:space-y-6">
      <header><p className="text-sm font-medium text-teal-700">Clinical workspace</p><h1 className="mt-1 text-2xl font-bold text-slate-900">Patient charts</h1><p className="mt-1 text-sm text-slate-500">Patients with an appointment in your clinic records. Open a chart to review visits and clinical history.</p></header>
      {patients.length === 0 ? <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-6 text-sm text-slate-600">No patient appointments were found for your account.</div> : <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">{patients.map((patient) => <Link key={patient.email} href={`/dashboard/doctor/patients/${encodeURIComponent(patient.email)}`} className="min-w-0 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-teal-300 sm:p-5"><p className="break-words font-semibold text-slate-900">{patient.name}</p><p className="mt-1 break-all text-sm text-slate-500">{patient.email}</p><div className="mt-4 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500"><span>{patient.visit_count} visit{Number(patient.visit_count) === 1 ? '' : 's'}</span><span>Last visit: {patient.last_visit ? String(patient.last_visit) : 'N/A'}</span>{patient.patient_number && <span>ID {patient.patient_number}</span>}</div><span className="mt-3 inline-flex min-h-11 items-center text-sm font-semibold text-teal-800">Open chart →</span></Link>)}</div>}
    </main>
  );
}
