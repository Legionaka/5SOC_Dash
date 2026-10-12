import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { fetchPatientNotifications } from '@/app/lib/data';
import NotificationList from './notification-list';

export default async function PatientNotificationsPage() {
  const session = await auth();
  if (session?.user.role !== 'patient' || !session.user.email) redirect('/unauthorized');
  const notifications = await fetchPatientNotifications(session.user.email);
  return (
    <main className="mx-auto w-full max-w-5xl space-y-6">
      <header>
        <p className="text-sm font-semibold uppercase tracking-[0.16em] text-teal-700">Billing & account</p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-950">Notifications</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">Stay informed about your appointments, payments, profile, and care journey.</p>
      </header>
      <NotificationList notifications={notifications.map((item) => ({ id: String(item.id), type: item.type, message: item.message, read: item.read, created_at: String(item.created_at) }))} />
    </main>
  );
}
