import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { fetchPatientDashboardData } from '@/app/lib/data';
import { PatientAppointmentsSection } from '../client-components';

export default async function PatientAppointmentsPage() {
  const session = await auth();
  if (session?.user.role !== 'patient' || !session.user.email) redirect('/unauthorized');
  const data = await fetchPatientDashboardData(session.user.email);
  return <main className="space-y-6"><div><p className="text-sm font-medium text-teal-700">My care</p><h1 className="mt-1 text-2xl font-bold text-slate-900">Appointments</h1></div><PatientAppointmentsSection appointments={data.upcomingAppointments} bookingOptions={data.bookingOptions} /></main>;
}
