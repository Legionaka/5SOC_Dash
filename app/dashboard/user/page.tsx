import { auth } from '@/auth';
import { lusitana } from '@/app/ui/fonts';
import { redirect } from 'next/navigation';
import { TEST_PATIENT_EMAIL } from '@/app/lib/access-control';

export default async function PatientDashboardPage() {
  const session = await auth();
  if (
    session?.user.role !== 'patient' ||
    session.user.email !== TEST_PATIENT_EMAIL
  ) {
    redirect('/unauthorized');
  }

  return (
    <main>
      <h1 className={`${lusitana.className} mb-4 text-xl md:text-2xl`}>
        Patient Portal
      </h1>
      <p className="text-sm text-gray-600">
        Welcome, {session.user.name ?? 'Patient'}.
      </p>
    </main>
  );
}
