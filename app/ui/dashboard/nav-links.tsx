'use client';

import {
  ArchiveBoxIcon,
  BeakerIcon,
  BellAlertIcon,
  CalendarDaysIcon,
  ChatBubbleLeftRightIcon,
  ClipboardDocumentListIcon,
  ComputerDesktopIcon,
  DocumentDuplicateIcon,
  HeartIcon,
  HomeIcon,
  IdentificationIcon,
  RectangleStackIcon,
  WalletIcon,
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

type NavSection = { name: string; items: NavItem[] };

const LINKS_BY_ROLE: Partial<Record<UserRole, NavSection[]>> = {
  admin: [
    { name: 'Overview', items: [{ name: 'Home', href: '/dashboard', icon: HomeIcon, exact: true }] },
    { name: 'Operations', items: [
      { name: 'Patients', href: '/dashboard/customers', icon: UserGroupIcon },
      { name: 'Staff accounts', href: '/dashboard/admin/staff', icon: IdentificationIcon },
      { name: 'Invoices', href: '/dashboard/invoices', icon: DocumentDuplicateIcon },
      { name: 'Queue', href: '/dashboard/queue', icon: RectangleStackIcon },
      { name: 'Calendar', href: '/dashboard/calendar', icon: CalendarDaysIcon },
      { name: 'Patient charts', href: '/dashboard/doctor/patients', icon: UserIcon },
      { name: 'Results', href: '/dashboard/doctor/results', icon: BeakerIcon },
      { name: 'Prescriptions & referrals', href: '/dashboard/doctor/orders', icon: DocumentDuplicateIcon },
      { name: 'Clinical notes', href: '/dashboard/doctor/notes', icon: DocumentDuplicateIcon },
      { name: 'Availability', href: '/dashboard/doctor/availability', icon: CalendarDaysIcon },
      { name: 'Patient messages', href: '/dashboard/doctor/requests', icon: ChatBubbleLeftRightIcon },
    ] },
  ],
  patient: [
    { name: 'My care', items: [
      { name: 'Overview', href: '/dashboard/user', icon: HomeIcon, exact: true },
      { name: 'Appointments', href: '/dashboard/user/appointments', icon: CalendarDaysIcon },
      { name: 'Medical records', href: '/dashboard/user/records', icon: HeartIcon },
    ] },
    { name: 'Billing & account', items: [
      { name: 'Wallet', href: '/dashboard/user/wallet', icon: WalletIcon },
      { name: 'Invoices', href: '/dashboard/user/invoices', icon: DocumentDuplicateIcon },
      { name: 'Notifications', href: '/dashboard/user/notifications', icon: BellAlertIcon },
      { name: 'Profile', href: '/dashboard/user/profile', icon: IdentificationIcon },
    ] },
  ],
  doctor: [
    { name: 'Clinical', items: [
      { name: 'Workspace', href: '/dashboard/doctor', icon: ClipboardDocumentListIcon },
      { name: 'Queue', href: '/dashboard/queue', icon: RectangleStackIcon },
      { name: 'Calendar', href: '/dashboard/calendar', icon: CalendarDaysIcon },
      { name: 'Patient charts', href: '/dashboard/doctor/patients', icon: UserIcon },
      { name: 'Results', href: '/dashboard/doctor/results', icon: BeakerIcon },
      { name: 'Prescriptions & referrals', href: '/dashboard/doctor/orders', icon: DocumentDuplicateIcon },
      { name: 'Clinical notes', href: '/dashboard/doctor/notes', icon: DocumentDuplicateIcon },
      { name: 'Availability', href: '/dashboard/doctor/availability', icon: CalendarDaysIcon },
      { name: 'Patient messages', href: '/dashboard/doctor/requests', icon: ChatBubbleLeftRightIcon },
    ] },
  ],
  nurse: [
    { name: 'Nursing', items: [
      { name: 'Triage workspace', href: '/dashboard/nurse', icon: ClipboardDocumentListIcon, exact: true },
      { name: 'Appointment queue', href: '/dashboard/queue', icon: RectangleStackIcon },
      { name: 'Calendar', href: '/dashboard/calendar', icon: CalendarDaysIcon },
    ] },
  ],
  pharmacy_reception: [
    { name: 'Front desk', items: [
      { name: 'Workspace', href: '/dashboard/pharmacy/reception', icon: ComputerDesktopIcon },
      { name: 'Queue', href: '/dashboard/queue', icon: RectangleStackIcon },
      { name: 'Calendar', href: '/dashboard/calendar', icon: CalendarDaysIcon },
    ] },
  ],
  pharmacy_stocker: [
    { name: 'Inventory', items: [{ name: 'Pharmacy stock', href: '/dashboard/pharmacy/stock', icon: ArchiveBoxIcon }] },
  ],
  pharmacist: [
    { name: 'Pharmacy', items: [{ name: 'Prescription queue', href: '/dashboard/pharmacy/pharmacist', icon: BeakerIcon }] },
  ],
};

export default function NavLinks({
  role,
  collapsed = false,
  onNavigate,
}: {
  role?: UserRole;
  collapsed?: boolean;
  onNavigate?: () => void;
}) {
  const pathname = usePathname();
  const sections = (role && LINKS_BY_ROLE[role]) || [];

  return (
    <>
      {sections.map((section) => (
        <div key={section.name} className="flex min-w-max flex-col gap-1 md:min-w-0">
          <p className={clsx('px-3 pb-1 pt-2 text-[11px] font-semibold uppercase tracking-wider text-slate-400', collapsed && 'md:hidden')}>
            {section.name}
          </p>
          {section.items.map((link) => {
        const LinkIcon = link.icon;
        const isActive = link.exact
          ? pathname === link.href
          : pathname === link.href || pathname.startsWith(`${link.href}/`);

        return (
          <Link
            key={link.name}
            href={link.href}
            onClick={onNavigate}
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
        </div>
      ))}
    </>
  );
}
