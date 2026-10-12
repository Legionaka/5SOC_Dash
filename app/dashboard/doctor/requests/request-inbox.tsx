'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { respondToPatientRequest } from '@/app/lib/patient-actions';

type RequestItem = { id: string; patient: string; email: string; type: string; message: string; createdAt: string };

export default function PatientRequestInbox({ requests }: { requests: RequestItem[] }) {
  const [replies, setReplies] = useState<Record<string, string>>({});
  const [feedback, setFeedback] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState<string | null>(null);
  const router = useRouter();

  async function submit(id: string) {
    setSaving(id);
    const result = await respondToPatientRequest(id, replies[id] ?? '');
    setSaving(null);
    setFeedback((current) => ({ ...current, [id]: result.message }));
    if (result.success) router.refresh();
  }

  if (requests.length === 0) return <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-sm text-slate-600">No open patient messages.</div>;
  return <div className="space-y-4">{requests.map((item) => <article key={item.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-xs font-semibold uppercase tracking-wide text-teal-800">{item.type.replaceAll('_', ' ')}</p><h2 className="mt-1 font-semibold text-slate-900">{item.patient}</h2><p className="text-sm text-slate-500">{item.email} · {new Date(item.createdAt).toLocaleString()}</p></div><span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-medium text-amber-800">Open</span></div><p className="mt-4 whitespace-pre-wrap text-sm leading-6 text-slate-700">{item.message}</p><label className="mt-4 block text-sm font-medium text-slate-700">Reply<textarea value={replies[item.id] ?? ''} onChange={(event) => setReplies((current) => ({ ...current, [item.id]: event.target.value }))} rows={3} maxLength={2000} placeholder="Write a patient-facing reply" className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2" /></label><button onClick={() => submit(item.id)} disabled={saving === item.id || (replies[item.id] ?? '').trim().length < 2} className="mt-3 rounded-lg bg-teal-700 px-4 py-2 text-sm font-medium text-white disabled:opacity-50">{saving === item.id ? 'Sending…' : 'Send reply and close'}</button>{feedback[item.id] && <p role="status" className="mt-2 text-sm text-slate-600">{feedback[item.id]}</p>}</article>)}</div>;
}
