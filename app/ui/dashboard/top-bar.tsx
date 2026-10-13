'use client';

import { BellIcon, ChevronRightIcon } from '@heroicons/react/24/outline';
import { usePathname } from 'next/navigation';
import type { UserRole } from '@/app/lib/definitions';

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

export default function TopBar({ name, role }: { name: string; role: UserRole }) {
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
      <button type="button" aria-label="Notifications" className="relative inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 transition hover:border-teal-300 hover:text-teal-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-700">
        <BellIcon className="h-5 w-5" />
        <span className="absolute right-2 top-2 h-1.5 w-1.5 rounded-full bg-rose-500" aria-hidden="true" />
      </button>
      <div className="hidden max-w-40 text-right sm:block">
        <p className="truncate text-sm font-semibold text-slate-800">{name}</p>
        <p className="text-xs text-slate-500">Signed in</p>
      </div>
    </div>
  </header>;
}
