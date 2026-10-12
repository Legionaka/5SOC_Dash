'use client';

import { useState } from 'react';
import { markPatientNotificationRead } from '@/app/lib/patient-actions';

export default function NotificationList({ notifications }: { notifications: Array<{ id: string; type: string; message: string; read: boolean; created_at: string }> }) {
  const [items, setItems] = useState(notifications);
  const markRead = async (id: string) => {
    const result = await markPatientNotificationRead(id);
    if (result.success) setItems((current) => current.map((item) => item.id === id ? { ...item, read: true } : item));
  };
  return <div className="space-y-3">{items.length === 0 ? <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-sm text-slate-500">You have no notifications.</div> : items.map((item) => <article key={item.id} className={`rounded-2xl border p-4 ${item.read ? 'border-slate-200 bg-white' : 'border-teal-200 bg-teal-50'}`}><div className="flex items-start justify-between gap-4"><div><p className="text-xs font-semibold uppercase tracking-wide text-teal-700">{item.type}</p><p className="mt-1 text-sm text-slate-700">{item.message}</p><p className="mt-2 text-xs text-slate-400">{String(item.created_at).slice(0, 16)}</p></div>{!item.read && <button onClick={() => markRead(item.id)} className="shrink-0 text-xs font-medium text-teal-700 hover:text-teal-900">Mark read</button>}</div></article>)}</div>;
}
