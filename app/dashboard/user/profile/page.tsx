import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { fetchPatientProfile } from '@/app/lib/data';
import ProfileForm from './profile-form';

export default async function PatientProfilePage() {
  const session = await auth();
  if (session?.user.role !== 'patient' || !session.user.email) redirect('/unauthorized');
  const profile = await fetchPatientProfile(session.user.email);
  return <main className="space-y-6"><div><p className="text-sm font-medium text-teal-700">Account</p><h1 className="mt-1 text-2xl font-bold text-slate-900">Profile</h1></div><ProfileForm profile={profile} /></main>;
}
