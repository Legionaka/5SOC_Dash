import RoleHome from '@/app/ui/dashboard/role-home';

export default function DoctorDashboardPage() {
  return (
    <RoleHome
      roles={['admin', 'doctor']}
      title="Doctor Workspace"
      description="Clinical dashboard access is available for authorized doctors."
    />
  );
}
