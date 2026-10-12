import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { fetchStaffQueue } from '@/app/lib/data';
import DoctorQueueView from '../doctor/queue-view';

export default async function QueuePage() {
  const session = await auth();
  if (!session?.user.role || !['admin', 'doctor', 'nurse', 'pharmacy_reception'].includes(session.user.role)) redirect('/unauthorized');
  const queue = await fetchStaffQueue();
  return <main className="mx-auto w-full max-w-7xl space-y-6 pb-10"><div><p className="text-sm font-medium text-teal-700">Operations</p><h1 className="mt-1 text-2xl font-bold text-slate-900">Clinical queue</h1><p className="mt-1 text-sm text-slate-500">Upcoming patient appointments requiring operational attention. Check-in updates appear across the clinical workspace.</p></div><DoctorQueueView canOpenCharts={['admin', 'doctor'].includes(session.user.role)} limitedCheckIn={!['admin', 'doctor'].includes(session.user.role)} appointments={queue.map((item) => ({ id: String(item.id), patientEmail: String(item.patient_email), patientName: String(item.patient_name), doctor: String(item.doctor_name), specialty: String(item.specialty), date: String(item.appointment_date), time: String(item.appointment_time), reason: String(item.reason), status: String(item.status), checkInStatus: String(item.check_in_status ?? 'Not checked in') }))} /></main>;
}
