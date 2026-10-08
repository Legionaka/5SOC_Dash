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
    <main className="mx-auto w-full max-w-5xl">
      <header className="border-b border-slate-200 pb-6">
        <p className="text-sm font-medium text-teal-700">Patient Portal</p>
        <h1
          className={`${lusitana.className} mt-2 text-2xl font-bold text-slate-900 md:text-3xl`}
        >
          Welcome, {session.user.name ?? 'Patient'}
        </h1>
      </header>
    </main>
  );
}
