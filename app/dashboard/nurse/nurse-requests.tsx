'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { respondToNurseRequest } from '@/app/lib/nurse-actions';

type Request = { id: string; patient: string; email: string; type: string; message: string; createdAt: string };

export default function NurseRequests({ requests }: { requests: Request[] }) {
  const router = useRouter();
  const [busyId, setBusyId] = useState('');
  const [feedback, setFeedback] = useState<Record<string, string>>({});
  async function reply(event: React.FormEvent<HTMLFormElement>, id: string) {
    event.preventDefault(); const data = new FormData(event.currentTarget); const response = String(data.get('response') ?? '');
    setBusyId(id); const result = await respondToNurseRequest({ requestId: id, response }); setBusyId('');
    setFeedback((current) => ({ ...current, [id]: result.message }));
    if (result.success) router.refresh();
  }
  return <section className="space-y-3"><div><h2 className="text-lg font-semibold text-slate-900">Patient messages</h2><p className="text-sm text-slate-500">Reply to routine intake and service questions. Escalate urgent or clinical concerns to the doctor.</p></div>
    {requests.length ? <div className="grid gap-3 lg:grid-cols-2">{requests.map((item) => <article key={item.id} className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5"><div className="flex flex-col gap-1 min-[440px]:flex-row min-[440px]:items-start min-[440px]:justify-between"><div className="min-w-0"><h3 className="break-words font-semibold text-slate-900">{item.patient}</h3><p className="break-all text-sm text-slate-500">{item.email}</p></div><span className="w-fit rounded-full bg-sky-50 px-2.5 py-1 text-xs font-medium text-sky-800">{item.type}</span></div><p className="whitespace-pre-wrap break-words rounded-xl bg-slate-50 p-3 text-sm leading-6 text-slate-700">{item.message}</p><p className="text-xs text-slate-400">Received {item.createdAt}</p><form onSubmit={(event) => reply(event, item.id)} className="space-y-2"><label className="block text-sm font-medium text-slate-700">Reply<textarea required minLength={2} maxLength={2000} name="response" rows={3} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" placeholder="Write a response for the patient portal" /></label><button disabled={busyId === item.id} className="min-h-11 w-full rounded-lg bg-teal-700 px-4 text-sm font-semibold text-white disabled:opacity-50 sm:w-auto">{busyId === item.id ? 'Sending…' : 'Send reply'}</button>{feedback[item.id] && <p role="status" className="text-sm text-slate-600">{feedback[item.id]}</p>}</form></article>)}</div> : <p className="rounded-xl border border-dashed border-slate-300 bg-white p-5 text-sm text-slate-500">No open patient messages.</p>}
  </section>;
}
