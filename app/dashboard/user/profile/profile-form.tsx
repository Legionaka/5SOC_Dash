'use client';

import { useState } from 'react';
import { updatePatientProfile } from '@/app/lib/patient-actions';

export default function ProfileForm({ profile }: { profile: { name?: string; email?: string; date_of_birth?: string | Date | null; phone?: string | null; national_id?: string | null; pharmacy_preference?: string | null } }) {
  const [form, setForm] = useState({
    name: profile.name ?? '',
    dateOfBirth: profile.date_of_birth ? String(profile.date_of_birth).slice(0, 10) : '',
    phone: profile.phone ?? '',
    nationalId: profile.national_id ?? '',
    pharmacyPreference: profile.pharmacy_preference ?? '',
  });
  const [message, setMessage] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const update = (field: keyof typeof form, value: string) => setForm((current) => ({ ...current, [field]: value }));
  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    const result = await updatePatientProfile(form);
    setSaving(false);
    setMessage(result.message);
  };

  return (
    <form onSubmit={submit} className="max-w-2xl space-y-5 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div><h2 className="text-lg font-semibold text-slate-900">Personal information</h2><p className="mt-1 text-sm text-slate-500">Keep your care-team details accurate.</p></div>
      <label className="block text-sm font-medium text-slate-700">Full name<input value={form.name} onChange={(e) => update('name', e.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2" required /></label>
      <label className="block text-sm font-medium text-slate-700">Email<input value={profile.email ?? ''} readOnly className="mt-1 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-slate-500" /></label>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block text-sm font-medium text-slate-700">Date of birth<input type="date" value={form.dateOfBirth} onChange={(e) => update('dateOfBirth', e.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2" /></label>
        <label className="block text-sm font-medium text-slate-700">Phone<input value={form.phone} onChange={(e) => update('phone', e.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2" /></label>
      </div>
      <label className="block text-sm font-medium text-slate-700">National ID / passport<input value={form.nationalId} onChange={(e) => update('nationalId', e.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2" /></label>
      <label className="block text-sm font-medium text-slate-700">Preferred pharmacy<input value={form.pharmacyPreference} onChange={(e) => update('pharmacyPreference', e.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2" /></label>
      <button disabled={saving} className="rounded-lg bg-teal-700 px-4 py-2 text-sm font-medium text-white disabled:opacity-50">{saving ? 'Saving...' : 'Save changes'}</button>
      {message && <p className="text-sm text-slate-600" role="status">{message}</p>}
    </form>
  );
}
