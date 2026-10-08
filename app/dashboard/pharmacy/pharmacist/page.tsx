import RoleHome from '@/app/ui/dashboard/role-home';

export default function PharmacistDashboardPage() {
  return (
    <RoleHome
      roles={['admin', 'pharmacist']}
      title="Pharmacist Workspace"
      description="Prescription access is available for authorized pharmacists."
    />
  );
}
