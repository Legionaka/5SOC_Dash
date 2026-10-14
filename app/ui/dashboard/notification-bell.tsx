'use client';

import { BellAlertIcon, BellIcon, CalendarDaysIcon } from '@heroicons/react/24/outline';
import { useState } from 'react';

type Notification = { id: string; type: string; message: string; createdAt: string };

export default function NotificationBell({ notifications }: { notifications: Notification[] }) {
  const [open, setOpen] = useState(false);

  return <div className="relative">
    <button type="button" aria-label={`Notifications${notifications.length ? `, ${notifications.length} unread` : ''}`} aria-expanded={open} onClick={() => setOpen((value) => !value)} className="relative inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 transition hover:border-teal-300 hover:text-teal-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-700">
      {notifications.length ? <BellAlertIcon className="h-5 w-5 text-teal-700" /> : <BellIcon className="h-5 w-5" />}
      {notifications.length > 0 && <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-rose-600 px-1 text-[10px] font-bold text-white">{notifications.length > 9 ? '9+' : notifications.length}</span>}
    </button>
    {open && <div className="absolute right-0 z-30 mt-2 w-[min(21rem,calc(100vw-2rem))] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl shadow-slate-900/10">
      <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3"><div><p className="text-sm font-semibold text-slate-900">Notifications</p><p className="text-xs text-slate-500">{notifications.length ? `${notifications.length} unread update${notifications.length === 1 ? '' : 's'}` : 'You are all caught up'}</p></div><BellIcon className="h-5 w-5 text-slate-400" /></div>
      {notifications.length ? <div className="max-h-80 overflow-y-auto">{notifications.map((item) => <div key={item.id} className="flex gap-3 border-b border-slate-100 p-4 last:border-0"><span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-teal-50 text-teal-700"><CalendarDaysIcon className="h-4 w-4" /></span><div className="min-w-0"><p className="text-xs font-bold uppercase tracking-wide text-teal-700">{item.type.replaceAll('_', ' ')}</p><p className="mt-1 text-sm leading-5 text-slate-700">{item.message}</p><p className="mt-1 text-[11px] text-slate-400">{item.createdAt}</p></div></div>)}</div> : <div className="px-4 py-8 text-center"><BellIcon className="mx-auto h-7 w-7 text-slate-300" /><p className="mt-2 text-sm text-slate-500">No new notifications.</p></div>}
    </div>}
  </div>;
}
