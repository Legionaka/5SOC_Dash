'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { submitPatientRequest } from '@/app/lib/patient-actions';
import { BellAlertIcon, ClipboardDocumentCheckIcon, ClockIcon, DocumentTextIcon, PaperAirplaneIcon } from '@heroicons/react/24/outline';

type Appointment = { id: string; doctor: string; specialty: string; date: string; time: string; status: string };
type RecordItem = { id: string; type: string; title: string; summary: string; status: string; date: string };

export default function PatientDashboardEnhancements({ appointments, records, invoices, unreadNotifications, phone, contactMethod, needsProfileUpdate, requests }: {
  appointments: Appointment[];
  records: RecordItem[];
  invoices: Array<{ id: string; status: string; amount: string }>;
  unreadNotifications: number;
  phone?: string | null;
  contactMethod?: string | null;
  needsProfileUpdate: boolean;
  requests: Array<{ id: string; type: string; message: string; status: string; response: string | null; createdAt: string; respondedAt: string | null }>;
}) {
  const [kind, setKind] = useState<'question' | 'appointment_change' | 'prescription_refill' | 'records_request'>('question');
  const [message, setMessage] = useState('');
  const [feedback, setFeedback] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const router = useRouter();
  const upcoming = appointments.filter((item) => !['Cancelled', 'Completed', 'Rejected'].includes(item.status));
  const openInvoices = invoices.filter((item) => item.status.toLowerCase() === 'pending');
  const latest = [
    ...appointments.map((item) => ({ id: `a-${item.id}`, date: item.date, title: `${item.specialty} visit`, detail: `${item.doctor} · ${item.status}`, href: '/dashboard/user/appointments', kind: 'Appointment' })),
    ...records.map((item) => ({ id: `r-${item.id}`, date: item.date.slice(0, 10), title: item.title, detail: `${item.type} · ${item.status}`, href: '/dashboard/user/records', kind: 'Record' })),
  ].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 6);

  async function sendRequest(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSending(true);
    setFeedback(null);
    const result = await submitPatientRequest({ type: kind, message });
    setSending(false);
    setFeedback(result.message);
    if (result.success) { setMessage(''); router.refresh(); }
  }

  return <div className="grid gap-6 lg:grid-cols-3">
    <section className="rounded-2xl border border-teal-200 bg-teal-50/60 p-6 lg:col-span-2">
      <div className="flex items-center gap-3"><div className="rounded-xl bg-white p-2 text-teal-700"><ClipboardDocumentCheckIcon className="h-5 w-5" /></div><div><h2 className="font-semibold text-slate-900">Your next steps</h2><p className="text-sm text-slate-600">A short list of things that may need your attention.</p></div></div>
      <div className="mt-4 space-y-2">
        {upcoming.slice(0, 1).map((item) => <Link key={item.id} href="/dashboard/user/appointments" className="flex items-center justify-between gap-3 rounded-xl bg-white p-3 text-sm hover:ring-1 hover:ring-teal-300"><span><span className="block font-medium text-slate-900">Prepare for your {item.specialty.toLowerCase()} visit</span><span className="text-slate-500">{item.date} at {item.time} · {item.status}</span></span><span className="shrink-0 font-medium text-teal-800">View →</span></Link>)}
        {openInvoices.slice(0, 1).map((item) => <Link key={item.id} href="/dashboard/user/invoices" className="flex items-center justify-between gap-3 rounded-xl bg-white p-3 text-sm"><span><span className="block font-medium text-slate-900">Review a pending invoice</span><span className="text-slate-500">{item.amount} is awaiting review or payment.</span></span><span className="shrink-0 font-medium text-teal-800">View →</span></Link>)}
        {unreadNotifications > 0 && <Link href="/dashboard/user/notifications" className="flex items-center justify-between rounded-xl bg-white p-3 text-sm"><span className="flex items-center gap-2 font-medium text-slate-900"><BellAlertIcon className="h-4 w-4 text-teal-700" />Read {unreadNotifications} clinic update{unreadNotifications === 1 ? '' : 's'}</span><span className="font-medium text-teal-800">Open →</span></Link>}
        {needsProfileUpdate && <Link href="/dashboard/user/profile" className="flex items-center justify-between gap-3 rounded-xl bg-white p-3 text-sm"><span><span className="block font-medium text-slate-900">Complete your care contact details</span><span className="text-slate-500">Add a phone number and emergency contact.</span></span><span className="shrink-0 font-medium text-teal-800">Update →</span></Link>}
        {upcoming.length === 0 && openInvoices.length === 0 && unreadNotifications === 0 && !needsProfileUpdate && <p className="rounded-xl bg-white p-4 text-sm text-slate-600">You’re all caught up. New appointments, records, and clinic updates will appear here.</p>}
      </div>
    </section>

    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"><div className="flex items-center gap-3"><ClockIcon className="h-5 w-5 text-teal-700" /><div><h2 className="font-semibold text-slate-900">Care reminders</h2><p className="text-sm text-slate-500">Based on information in your account</p></div></div><ul className="mt-4 space-y-3 text-sm text-slate-600">{upcoming.slice(0, 2).map((item) => <li key={item.id}><span className="font-medium text-slate-800">{item.date} · {item.time}</span><br />Upcoming appointment with {item.doctor}.</li>)}{records.slice(0, 1).map((item) => <li key={item.id}><span className="font-medium text-slate-800">Care record available</span><br />Review “{item.title}” with your clinician if you have questions.</li>)}{upcoming.length === 0 && records.length === 0 && <li>No appointment or care-plan reminders are available yet.</li>}<li>Personal medication reminders can be added below. They are not synced with prescriptions.</li></ul></section>

    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm lg:col-span-2"><div className="flex items-center gap-3"><div className="rounded-xl bg-sky-100 p-2 text-sky-700"><DocumentTextIcon className="h-5 w-5" /></div><div><h2 className="font-semibold text-slate-900">Your care timeline</h2><p className="text-sm text-slate-500">Recent appointments and records shared by your clinic.</p></div></div><div className="mt-5 space-y-0">{latest.length ? latest.map((item) => <Link key={item.id} href={item.href} className="flex gap-3 border-l-2 border-teal-200 py-3 pl-4 first:pt-0"><span className="mt-1 h-2 w-2 -translate-x-[21px] rounded-full bg-teal-600" /><span className="-ml-4 min-w-0"><span className="text-xs font-medium uppercase tracking-wide text-teal-700">{item.kind} · {item.date}</span><span className="mt-0.5 block font-medium text-slate-900">{item.title}</span><span className="block text-sm text-slate-500">{item.detail}</span></span></Link>) : <p className="mt-4 text-sm text-slate-500">Your appointments and shared records will appear here.</p>}</div><Link href="/dashboard/user/records" className="mt-3 inline-block text-sm font-medium text-teal-800">Open medical records →</Link></section>

    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"><h2 className="font-semibold text-slate-900">Message your care team</h2><p className="mt-1 text-sm text-slate-500">For routine questions and requests. This is not an emergency service.</p><form onSubmit={sendRequest} className="mt-4 space-y-3"><label className="block text-xs font-medium text-slate-700">Request type<select value={kind} onChange={(e) => setKind(e.target.value as typeof kind)} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"><option value="question">General question</option><option value="appointment_change">Appointment change</option><option value="prescription_refill">Prescription refill</option><option value="records_request">Medical records</option></select></label><label className="block text-xs font-medium text-slate-700">Message<textarea value={message} onChange={(e) => setMessage(e.target.value)} minLength={10} maxLength={2000} required rows={3} placeholder="How can the care team help?" className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" /></label><button disabled={sending} className="inline-flex items-center gap-2 rounded-lg bg-teal-700 px-3 py-2 text-sm font-medium text-white disabled:opacity-50"><PaperAirplaneIcon className="h-4 w-4" />{sending ? 'Sending…' : 'Send request'}</button></form>{feedback && <p role="status" className="mt-3 text-sm text-slate-600">{feedback}</p>}<p className="mt-3 text-xs text-slate-500">Reply preference: {contactMethod === 'phone' && phone ? `phone · ${phone}` : 'email'} · Update this in <Link className="text-teal-800 underline" href="/dashboard/user/profile">your profile</Link>.</p></section>
    {requests.length > 0 && <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm lg:col-span-3"><h2 className="font-semibold text-slate-900">Your care team messages</h2><p className="mt-1 text-sm text-slate-500">Replies from your care team appear here.</p><div className="mt-4 grid gap-3 md:grid-cols-2">{requests.map((item) => <article key={item.id} className="rounded-xl border border-slate-200 bg-slate-50 p-4"><div className="flex items-center justify-between gap-3"><p className="text-xs font-semibold uppercase tracking-wide text-teal-800">{item.type.replaceAll('_', ' ')}</p><span className="rounded-full bg-white px-2 py-1 text-xs text-slate-600">{item.status}</span></div><p className="mt-2 whitespace-pre-wrap text-sm text-slate-800">{item.message}</p>{item.response ? <div className="mt-3 rounded-lg border border-teal-100 bg-white p-3"><p className="text-xs font-semibold text-teal-800">Care team reply</p><p className="mt-1 whitespace-pre-wrap text-sm text-slate-700">{item.response}</p></div> : <p className="mt-3 text-xs text-slate-500">Waiting for the care team to respond.</p>}<p className="mt-3 text-xs text-slate-400">Sent {new Date(item.createdAt).toLocaleString()}</p></article>)}</div></section>}
  </div>;
}
