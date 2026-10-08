'use client';

import Link from 'next/link';
import NavLinks from '@/app/ui/dashboard/nav-links';
import AcmeLogo from '@/app/ui/acme-logo';
import {
  ChevronDoubleLeftIcon,
  ChevronDoubleRightIcon,
  PowerIcon,
} from '@heroicons/react/24/outline';
import type { UserRole } from '@/app/lib/definitions';
import { signOutUser } from '@/app/lib/auth-actions';
import { useEffect, useState } from 'react';

const SIDEBAR_STORAGE_KEY = 'medi-clinic-sidebar-collapsed';

export default function SideNav({
  role,
  name,
  email,
}: {
  role?: UserRole;
  name?: string | null;
  email?: string | null;
}) {
  const [collapsed, setCollapsed] = useState(false);
  const [preferenceLoaded, setPreferenceLoaded] = useState(false);

  useEffect(() => {
    try {
      setCollapsed(window.localStorage.getItem(SIDEBAR_STORAGE_KEY) === 'true');
    } catch {
      setCollapsed(false);
    }
    setPreferenceLoaded(true);
  }, []);

  useEffect(() => {
    if (!preferenceLoaded) return;
    try {
      window.localStorage.setItem(SIDEBAR_STORAGE_KEY, String(collapsed));
    } catch {}
  }, [collapsed, preferenceLoaded]);

  const displayName = name?.trim() || 'Clinic user';
  const initials = displayName
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase();

  return (
    <aside
      className={`flex w-full shrink-0 flex-col border-b border-slate-200 bg-white px-4 py-4 md:h-screen md:border-b-0 md:border-r md:py-5 ${
        preferenceLoaded ? 'transition-[width] duration-200' : ''
      } ${collapsed ? 'md:w-[5.5rem] md:px-2' : 'md:w-64 md:px-4'}`}
      aria-label="Dashboard sidebar"
    >
      <div
        className={`flex items-center justify-between gap-2 ${
          collapsed ? 'md:flex-col md:justify-center md:gap-3' : ''
        }`}
      >
        <Link
          className="flex min-w-0 items-center gap-3 rounded-lg focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-700"
          href="/"
          aria-label="Medi-Clinic home"
        >
          <AcmeLogo
            className={`h-11 w-11 shrink-0 object-contain ${
              collapsed ? 'md:h-9 md:w-9' : ''
            }`}
          />
          <span
            className={`truncate text-sm font-bold tracking-tight text-slate-900 ${
              collapsed ? 'md:hidden' : ''
            }`}
          >
            Medi-Clinic
          </span>
        </Link>
        <button
          type="button"
          onClick={() => setCollapsed((current) => !current)}
          className="hidden h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-transparent text-slate-500 transition-colors hover:border-teal-700 hover:text-teal-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-700 md:inline-flex"
          aria-label={collapsed ? 'Expand sidebar' : 'Minimize sidebar'}
          aria-expanded={!collapsed}
          title={collapsed ? 'Expand sidebar' : 'Minimize sidebar'}
        >
          {collapsed ? (
            <ChevronDoubleRightIcon className="h-5 w-5" />
          ) : (
            <ChevronDoubleLeftIcon className="h-5 w-5" />
          )}
        </button>
      </div>

      <div
        className={`mt-4 flex items-center gap-3 rounded-xl border border-slate-100 bg-slate-50 p-3 md:mt-5 ${
          collapsed ? 'md:justify-center md:p-2' : ''
        }`}
        title={collapsed ? displayName : undefined}
      >
        <span
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-teal-700 text-sm font-semibold text-white"
          aria-hidden="true"
        >
          {initials}
        </span>
        <div className={`min-w-0 ${collapsed ? 'md:hidden' : ''}`}>
          <p className="truncate text-sm font-semibold text-slate-800">
            {displayName}
          </p>
          {email && (
            <p className="truncate text-xs text-slate-500">{email}</p>
          )}
        </div>
      </div>

      <nav
        aria-label="Main navigation"
        className="mt-4 flex grow flex-row gap-2 overflow-x-auto md:mt-6 md:flex-col md:overflow-visible"
      >
        <NavLinks role={role} collapsed={collapsed} />
      </nav>

      <form action={signOutUser} className="mt-3 border-t border-slate-100 pt-3">
        <button
          type="submit"
          className={`flex h-11 w-full items-center gap-3 rounded-xl border border-transparent px-3 text-sm font-medium text-slate-600 transition-colors hover:border-rose-300 hover:text-rose-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rose-500 ${
            collapsed ? 'justify-center md:px-0' : 'justify-center md:justify-start'
          }`}
          aria-label={collapsed ? 'Sign out' : undefined}
          title={collapsed ? 'Sign out' : undefined}
        >
          <PowerIcon className="h-5 w-5 shrink-0" />
          <span className={collapsed ? 'md:hidden' : undefined}>Sign out</span>
        </button>
      </form>
    </aside>
  );
}