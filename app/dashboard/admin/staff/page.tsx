import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { fetchAdminStaffAccounts } from '@/app/lib/data';
import StaffAccountForm from './staff-account-form';
import StaffAccountActions from './staff-account-actions';

const roleLabels: Record<string, string> = { doctor: 'Doctor', nurse: 'Nurse', pharmacist: 'Pharmacist', pharmacy_reception: 'Reception', pharmacy_stocker: 'Stocker' };

export default async function StaffAccountsPage() {
  const session = await auth();
  if (session?.user.role !== 'admin') redirect('/unauthorized');
  const accounts = await fetchAdminStaffAccounts();
  return <main className="mx-auto w-full max-w-7xl space-y-8 pb-10">
    <header>
      <p className="text-sm font-semibold text-teal-700">Administration</p>
      <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">Staff accounts</h1>
      <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">Create role-based access and manage the clinic&apos;s staff directory, account status, and authentication sessions.</p>
    </header>
    <StaffAccountForm />
    <section className="space-y-4">
      <div><h2 className="text-lg font-bold text-slate-900">Staff directory <span className="font-normal text-slate-400">({accounts.length})</span></h2><p className="mt-1 text-sm text-slate-500">Temporary-password accounts must be updated at first sign-in.</p></div>
      {accounts.length ? <>
        <div className="hidden overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm md:block">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500"><tr><th scope="col" className="px-5 py-4">Staff member</th><th scope="col" className="px-4 py-4">Role</th><th scope="col" className="px-4 py-4">Access state</th><th scope="col" className="px-4 py-4 text-right">Actions</th></tr></thead>
            <tbody className="divide-y divide-slate-100">{accounts.map((staff) => <tr key={staff.id} className="transition hover:bg-slate-50/70"><td className="px-5 py-4"><p className="font-semibold text-slate-900">{staff.name}</p><p className="mt-0.5 text-xs text-slate-500">{staff.email}</p></td><td className="px-4 py-4"><span className="rounded-full bg-teal-50 px-2.5 py-1 text-xs font-semibold text-teal-800">{roleLabels[String(staff.role)] ?? staff.role}</span></td><td className="px-4 py-4"><p className={`text-sm font-medium ${staff.active === false ? 'text-rose-700' : 'text-emerald-700'}`}>{staff.active === false ? 'Disabled' : 'Active'}</p><p className="mt-0.5 text-xs text-slate-500">{staff.must_change_password ? 'Password change required' : 'Account ready'}</p></td><td className="px-4 py-4 text-right"><div className="inline-block text-left"><StaffAccountActions staffId={String(staff.id)} email={staff.email} active={staff.active !== false} /></div></td></tr>)}</tbody>
          </table>
        </div>
        <div className="grid gap-3 md:hidden">{accounts.map((staff) => <article key={staff.id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"><div className="flex items-start justify-between gap-3"><div className="min-w-0"><h3 className="truncate font-semibold text-slate-900">{staff.name}</h3><p className="mt-1 break-all text-sm text-slate-500">{staff.email}</p></div><span className="shrink-0 rounded-full bg-teal-50 px-2.5 py-1 text-xs font-semibold text-teal-800">{roleLabels[String(staff.role)] ?? staff.role}</span></div><p className="mt-3 text-xs text-slate-500">{staff.must_change_password ? 'Password change required' : 'Account ready'}</p><StaffAccountActions staffId={String(staff.id)} email={staff.email} active={staff.active !== false} /></article>)}</div>
      </> : <p className="rounded-2xl border border-dashed border-slate-300 bg-white p-6 text-sm text-slate-500">No staff accounts have been created yet.</p>}
    </section>
  </main>;
}
