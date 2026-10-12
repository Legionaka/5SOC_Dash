import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { fetchOpenPatientRequests } from '@/app/lib/data';
import PatientRequestInbox from './request-inbox';

export default async function PatientRequestQueuePage() {
  const session = await auth();
  if (!session?.user.email || !['admin', 'doctor'].includes(session.user.role ?? '')) redirect('/unauthorized');
  const requests = await fetchOpenPatientRequests();
  return <main className="space-y-6"><header><p className="text-sm font-medium text-teal-700">Clinical workspace</p><h1 className="mt-1 text-2xl font-bold text-slate-900">Patient messages</h1><p className="mt-1 text-sm text-slate-500">Review routine patient questions and respond through the portal. Urgent matters should be handled through your clinic’s established escalation process.</p></header><PatientRequestInbox requests={requests.map((item) => ({ id: String(item.id), patient: String(item.patient_name ?? item.patient_email), email: String(item.patient_email), type: String(item.request_type), message: String(item.message), createdAt: String(item.created_at) }))} /></main>;
}
