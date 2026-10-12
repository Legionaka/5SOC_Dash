import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { fetchAdminStaffAccounts } from '@/app/lib/data';
import StaffAccountForm from './staff-account-form';

const roleLabels: Record<string, string> = { doctor: 'Doctor', nurse: 'Nurse', pharmacist: 'Pharmacist', pharmacy_reception: 'Reception', pharmacy_stocker: 'Stocker' };

export default async function StaffAccountsPage() {
  const session = await auth();
  if (session?.user.role !== 'admin') redirect('/unauthorized');
  const accounts = await fetchAdminStaffAccounts();
  return <main className="mx-auto w-full max-w-7xl space-y-6 pb-10">
    <header><p className="text-sm font-medium text-teal-700">Administration</p><h1 className="mt-1 text-2xl font-bold text-slate-900">Staff accounts</h1><p className="mt-1 text-sm text-slate-500">Create staff logins with role-specific dashboard access and manage the clinic’s staff directory.</p></header>
    <StaffAccountForm />
    <section className="space-y-3"><div><h2 className="text-lg font-semibold text-slate-900">Staff directory ({accounts.length})</h2><p className="text-sm text-slate-500">Temporary-password accounts are required to change their password when they first sign in.</p></div>
      {accounts.length ? <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{accounts.map((staff) => <article key={staff.id} className="min-w-0 rounded-xl border border-slate-200 bg-white p-4 shadow-sm"><div className="flex items-start justify-between gap-3"><h3 className="break-words font-semibold text-slate-900">{staff.name}</h3><span className="shrink-0 rounded-full bg-teal-50 px-2.5 py-1 text-xs font-medium text-teal-800">{roleLabels[String(staff.role)] ?? staff.role}</span></div><p className="mt-2 break-all text-sm text-slate-600">{staff.email}</p><p className="mt-3 text-xs text-slate-500">{staff.must_change_password ? 'Must change temporary password' : 'Account ready'}</p></article>)}</div> : <p className="rounded-xl border border-dashed border-slate-300 bg-white p-5 text-sm text-slate-500">No staff accounts have been created yet.</p>}
    </section>
  </main>;
}
