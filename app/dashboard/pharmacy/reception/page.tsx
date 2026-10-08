import RoleHome from '@/app/ui/dashboard/role-home';

export default function PharmacyReceptionPage() {
  return (
    <RoleHome
      roles={['admin', 'pharmacy_reception']}
      title="Pharmacy Front Desk"
      description="Front-desk access is available for authorized pharmacy reception staff."
    />
  );
}
