import RoleHome from '@/app/ui/dashboard/role-home';

export default function PharmacyStockPage() {
  return (
    <RoleHome
      roles={['admin', 'pharmacy_stocker']}
      title="Pharmacy Stock"
      description="Inventory access is available for authorized pharmacy stockers."
    />
  );
}
