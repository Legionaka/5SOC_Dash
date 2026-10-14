import { Metadata } from 'next';
import { requireAdmin } from '@/app/lib/security';
import { fetchAdminPatients } from '@/app/lib/data';
import PatientManagement from './patient-management';

export const metadata: Metadata = { title: 'Patients' };

export default async function PatientsPage(props: { searchParams?: Promise<{ query?: string }> }) {
  await requireAdmin();
  const query = (await props.searchParams)?.query ?? '';
  const patients = await fetchAdminPatients(query);
  return <PatientManagement patients={patients} query={query} />;
}
