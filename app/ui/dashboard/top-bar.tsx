'use client';

import { ChevronRightIcon } from '@heroicons/react/24/outline';
import { usePathname } from 'next/navigation';
import type { UserRole } from '@/app/lib/definitions';
import NotificationBell from './notification-bell';

const labels: Record<string, string> = {
  dashboard: 'Overview',
  admin: 'Administration',
  staff: 'Staff accounts',
  doctor: 'Doctor workspace',
  nurse: 'Nursing workspace',
  pharmacy: 'Pharmacy',
  reception: 'Reception',
  stock: 'Inventory',
  pharmacist: 'Prescription queue',
  calendar: 'Calendar',
  queue: 'Queue',
  patients: 'Patient charts',
  results: 'Results',
  notes: 'Clinical notes',
  orders: 'Prescriptions & referrals',
  availability: 'Availability',
  requests: 'Patient messages',
  invoices: 'Invoices',
  customers: 'Patients',
  user: 'My care',
  appointments: 'Appointments',
  records: 'Medical records',
  wallet: 'Wallet',
  notifications: 'Notifications',
  profile: 'Profile',
};

const roleLabels: Record<UserRole, string> = {
  admin: 'Administrator',
  doctor: 'Doctor',
  nurse: 'Nurse',
  patient: 'Patient',
  pharmacy_reception: 'Pharmacy reception',
  pharmacy_stocker: 'Pharmacy stock',
  pharmacist: 'Pharmacist',
};

type Notification = { id: string; type: string; message: string; createdAt: string };

export default function TopBar({ name, role, notifications }: { name: string; role: UserRole; notifications: Notification[] }) {
  const pathname = usePathname();
  const crumbs = pathname.split('/').filter(Boolean).map((part) => labels[part] ?? part.replaceAll('-', ' '));

  return <header className="mb-6 flex items-center justify-between gap-4 border-b border-slate-200 pb-5">
    <div className="min-w-0">
      <nav aria-label="Breadcrumb" className="mb-2 flex items-center gap-1.5 overflow-hidden text-xs font-medium text-slate-500">
        <span className="shrink-0">Medi-Clinic</span>
        {crumbs.map((crumb, index) => <span key={`${crumb}-${index}`} className="flex min-w-0 items-center gap-1.5"><ChevronRightIcon className="h-3.5 w-3.5 shrink-0 text-slate-300" /><span className={index === crumbs.length - 1 ? 'truncate text-slate-700' : 'truncate'}>{crumb}</span></span>)}
      </nav>
      <p className="truncate text-sm text-slate-500">{roleLabels[role]} workspace</p>
    </div>
    <div className="flex shrink-0 items-center gap-2">
      <NotificationBell notifications={notifications} />
      <div className="hidden max-w-40 text-right sm:block">
        <p className="truncate text-sm font-semibold text-slate-800">{name}</p>
        <p className="text-xs text-slate-500">Signed in</p>
      </div>
    </div>
  </header>;
}
