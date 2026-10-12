import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { fetchPatientNotifications } from '@/app/lib/data';
import NotificationList from './notification-list';

export default async function PatientNotificationsPage() {
  const session = await auth();
  if (session?.user.role !== 'patient' || !session.user.email) redirect('/unauthorized');
  const notifications = await fetchPatientNotifications(session.user.email);
  return <main className="space-y-6"><div><p className="text-sm font-medium text-teal-700">Billing & account</p><h1 className="mt-1 text-2xl font-bold text-slate-900">Notifications</h1></div><NotificationList notifications={notifications.map((item) => ({ id: String(item.id), type: item.type, message: item.message, read: item.read, created_at: String(item.created_at) }))} /></main>;
}
