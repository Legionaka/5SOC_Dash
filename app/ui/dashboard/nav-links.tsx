'use client';

import {
  UserGroupIcon,
  HomeIcon,
  DocumentDuplicateIcon,
} from '@heroicons/react/24/outline';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import clsx from 'clsx';
import type { UserRole } from '@/app/lib/definitions';

export default function NavLinks({
  role,
  collapsed = false,
}: {
  role?: UserRole;
  collapsed?: boolean;
}) {
  const pathname = usePathname();
  const links =
    role === 'admin'
      ? [
          { name: 'Home', href: '/dashboard', icon: HomeIcon },
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
        ]
      : role === 'patient'
        ? [{ name: 'Patient Portal', href: '/dashboard/user', icon: HomeIcon }]
        : role === 'doctor'
          ? [{ name: 'Doctor Workspace', href: '/dashboard/doctor', icon: HomeIcon }]
          : role === 'pharmacy_reception'
            ? [
                {
                  name: 'Front Desk',
                  href: '/dashboard/pharmacy/reception',
                  icon: HomeIcon,
                },
              ]
            : role === 'pharmacy_stocker'
              ? [
                  {
                    name: 'Pharmacy Stock',
                    href: '/dashboard/pharmacy/stock',
                    icon: HomeIcon,
                  },
                ]
              : role === 'pharmacist'
                ? [
                    {
                      name: 'Pharmacist Workspace',
                      href: '/dashboard/pharmacy/pharmacist',
                      icon: HomeIcon,
                    },
                  ]
                : [];

  return (
    <>
      {links.map((link) => {
        const LinkIcon = link.icon;
        return (
          <Link
            key={link.name}
            href={link.href}
            className={clsx(
              'group flex h-11 grow items-center justify-center gap-3 rounded-xl px-3 text-sm font-medium text-slate-600 transition hover:bg-teal-50 hover:text-teal-800 md:flex-none md:justify-start',
              {
                'bg-teal-50 font-semibold text-teal-800 ring-1 ring-inset ring-teal-100':
                  pathname === link.href,
                'md:justify-center md:px-0': collapsed,
              },
            )}
            aria-label={collapsed ? link.name : undefined}
            title={collapsed ? link.name : undefined}
            aria-current={pathname === link.href ? 'page' : undefined}
          >
            <LinkIcon className="h-5 w-5 shrink-0" />
            <span className={collapsed ? 'md:hidden' : undefined}>
              {link.name}
            </span>
          </Link>
        );
      })}
    </>
  );
}
