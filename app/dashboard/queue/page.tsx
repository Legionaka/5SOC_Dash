import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { fetchStaffQueue } from '@/app/lib/data';

export default async function QueuePage() {
  const session = await auth();
  if (!session?.user.role || !['admin', 'doctor', 'pharmacy_reception'].includes(session.user.role)) redirect('/unauthorized');
  const queue = await fetchStaffQueue();
  return <main className="space-y-6"><div><p className="text-sm font-medium text-teal-700">Operations</p><h1 className="mt-1 text-2xl font-bold text-slate-900">Clinical queue</h1><p className="mt-1 text-sm text-slate-500">Upcoming patient appointments requiring operational attention.</p></div><div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"><div className="overflow-x-auto"><table className="min-w-full text-left text-sm"><thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500"><tr><th className="px-5 py-3">Patient</th><th className="px-5 py-3">Doctor</th><th className="px-5 py-3">Date & time</th><th className="px-5 py-3">Reason</th><th className="px-5 py-3">Status</th></tr></thead><tbody>{queue.map((item) => <tr key={item.id} className="border-b border-slate-100 last:border-0"><td className="px-5 py-4 font-medium text-slate-900">{item.patient_email}</td><td className="px-5 py-4 text-slate-600">{item.doctor_name}</td><td className="px-5 py-4 text-slate-600">{String(item.appointment_date)} · {item.appointment_time}</td><td className="px-5 py-4 text-slate-600">{item.reason}</td><td className="px-5 py-4"><span className="rounded-full bg-amber-50 px-2 py-1 text-xs text-amber-700">{item.status}</span></td></tr>)}</tbody></table>{queue.length === 0 && <p className="p-8 text-sm text-slate-500">The queue is clear.</p>}</div></div></main>;
}
