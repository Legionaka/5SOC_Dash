import type { UserRole } from './definitions';

export const TEST_PATIENT_EMAIL = 'user@nextmail.com';

const dashboardRoleRoutes: {
  prefix: string;
  roles: readonly UserRole[];
}[] = [
  { prefix: '/dashboard/admin', roles: ['admin'] },
  { prefix: '/dashboard/doctor', roles: ['admin', 'doctor'] },
  {
    prefix: '/dashboard/pharmacy/reception',
    roles: ['admin', 'pharmacy_reception'],
  },
  {
    prefix: '/dashboard/pharmacy/stock',
    roles: ['admin', 'pharmacy_stocker'],
  },
  {
    prefix: '/dashboard/pharmacy/pharmacist',
    roles: ['admin', 'pharmacist'],
  },
];

function isAtOrBelow(pathname: string, prefix: string) {
  return pathname === prefix || pathname.startsWith(`${prefix}/`);
}

export function canAccessDashboardRoute(
  role: UserRole | undefined,
  email: string | null | undefined,
  pathname: string,
) {
  if (isAtOrBelow(pathname, '/dashboard/user')) {
    return role === 'patient' && email === TEST_PATIENT_EMAIL;
  }

  const roleRoute = dashboardRoleRoutes.find(({ prefix }) =>
    isAtOrBelow(pathname, prefix),
  );
  if (roleRoute) return role !== undefined && roleRoute.roles.includes(role);

  if (
    pathname === '/dashboard' ||
    isAtOrBelow(pathname, '/dashboard/invoices') ||
    isAtOrBelow(pathname, '/dashboard/customers')
  ) {
    return role === 'admin';
  }

  return false;
}

export function getDashboardHome(role: UserRole | undefined) {
  switch (role) {
    case 'admin':
      return '/dashboard';
    case 'doctor':
      return '/dashboard/doctor';
    case 'patient':
      return '/dashboard/user';
    case 'pharmacy_reception':
      return '/dashboard/pharmacy/reception';
    case 'pharmacy_stocker':
      return '/dashboard/pharmacy/stock';
    case 'pharmacist':
      return '/dashboard/pharmacy/pharmacist';
    default:
      return '/unauthorized';
  }
}
