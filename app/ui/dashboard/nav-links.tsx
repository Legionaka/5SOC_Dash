'use client';

import {
  ArchiveBoxIcon,
  BeakerIcon,
  ClipboardDocumentListIcon,
  ComputerDesktopIcon,
  DocumentDuplicateIcon,
  HomeIcon,
  UserGroupIcon,
  UserIcon,
} from '@heroicons/react/24/outline';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import clsx from 'clsx';
import type { UserRole } from '@/app/lib/definitions';

type NavItem = {
  name: string;
  href: string;
  icon: typeof HomeIcon;
  exact?: boolean;
};

const LINKS_BY_ROLE: Partial<Record<UserRole, NavItem[]>> = {
  admin: [
    { name: 'Home', href: '/dashboard', icon: HomeIcon, exact: true },
    {
      name: 'Invoices',
      href: '/dashboard/invoices',
      icon: DocumentDuplicateIcon,
    },
    {
      name: 'Customers',
      href: '/dashboard/customers',
      icon: UserGroupIcon,
    },
  ],
  patient: [
    { name: 'Patient Portal', href: '/dashboard/user', icon: UserIcon },
  ],
  doctor: [
    {
      name: 'Doctor Workspace',
      href: '/dashboard/doctor',
      icon: ClipboardDocumentListIcon,
    },
  ],
  pharmacy_reception: [
    {
      name: 'Front Desk',
      href: '/dashboard/pharmacy/reception',
      icon: ComputerDesktopIcon,
    },
  ],
  pharmacy_stocker: [
    {
      name: 'Pharmacy Stock',
      href: '/dashboard/pharmacy/stock',
      icon: ArchiveBoxIcon,
    },
  ],
  pharmacist: [
    {
      name: 'Pharmacist Workspace',
      href: '/dashboard/pharmacy/pharmacist',
      icon: BeakerIcon,
    },
  ],
};

export default function NavLinks({
  role,
  collapsed = false,
}: {
  role?: UserRole;
  collapsed?: boolean;
}) {
  const pathname = usePathname();
  const links = (role && LINKS_BY_ROLE[role]) || [];

  return (
    <>
      {links.map((link) => {
        const LinkIcon = link.icon;
        const isActive = link.exact
          ? pathname === link.href
          : pathname === link.href || pathname.startsWith(`${link.href}/`);

        return (
          <Link
            key={link.name}
            href={link.href}
            className={clsx(
              'flex h-11 shrink-0 grow items-center gap-3 whitespace-nowrap rounded-xl border px-3 text-sm font-medium transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-700 md:flex-none',
              isActive
                ? 'border-teal-100 bg-teal-50 font-semibold text-teal-800 hover:border-teal-700'
                : 'border-transparent text-slate-600 hover:border-teal-700 hover:text-teal-800',
              collapsed
                ? 'justify-center md:px-0'
                : 'justify-center md:justify-start',
            )}
            aria-label={collapsed ? link.name : undefined}
            title={collapsed ? link.name : undefined}
            aria-current={isActive ? 'page' : undefined}
          >
            <LinkIcon className="h-5 w-5 shrink-0" />
            <span className={clsx('truncate', collapsed && 'md:hidden')}>
              {link.name}
            </span>
          </Link>
        );
      })}
    </>
  );
}