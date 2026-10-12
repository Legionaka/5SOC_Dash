'use client';

import { useMemo, useState } from 'react';
import { BellAlertIcon, CalendarDaysIcon, CheckCircleIcon, InformationCircleIcon, WalletIcon } from '@heroicons/react/24/outline';
import { markAllPatientNotificationsRead, markPatientNotificationRead } from '@/app/lib/patient-actions';

type Notification = { id: string; type: string; message: string; read: boolean; created_at: string };

const filters = [{ id: 'all', label: 'All' }, { id: 'unread', label: 'Unread' }] as const;

function notificationIcon(type: string) {
  if (type.includes('appointment')) return CalendarDaysIcon;
  if (type.includes('wallet') || type.includes('refund')) return WalletIcon;
  if (type.includes('profile')) return CheckCircleIcon;
  return InformationCircleIcon;
}

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' }).format(date);
}

export default function NotificationList({ notifications }: { notifications: Notification[] }) {
  const [items, setItems] = useState(notifications);
  const [filter, setFilter] = useState<(typeof filters)[number]['id']>('all');
  const [isUpdating, setIsUpdating] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const unreadCount = items.filter((item) => !item.read).length;
  const visibleItems = useMemo(() => filter === 'unread' ? items.filter((item) => !item.read) : items, [filter, items]);

  const markRead = async (id: string) => {
    setIsUpdating(true);
    const result = await markPatientNotificationRead(id);
    setIsUpdating(false);
    setFeedback(result.message);
    if (result.success) setItems((current) => current.map((item) => item.id === id ? { ...item, read: true } : item));
  };

  const markAllRead = async () => {
    setIsUpdating(true);
    const result = await markAllPatientNotificationsRead();
    setIsUpdating(false);
    setFeedback(result.message);
    if (result.success) setItems((current) => current.map((item) => ({ ...item, read: true })));
  };

  return (
    <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-100 bg-gradient-to-r from-teal-50 via-white to-blue-50 p-5 sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex gap-3">
            <div className="rounded-2xl bg-teal-100 p-3 text-teal-700"><BellAlertIcon className="h-6 w-6" /></div>
            <div>
              <h2 className="text-lg font-semibold text-slate-950">Your care updates</h2>
              <p className="mt-1 text-sm text-slate-600">{unreadCount ? `${unreadCount} update${unreadCount === 1 ? '' : 's'} need your attention.` : 'You are all caught up.'}</p>
            </div>
          </div>
          <button type="button" onClick={markAllRead} disabled={!unreadCount || isUpdating} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:border-teal-300 hover:text-teal-800 disabled:cursor-not-allowed disabled:opacity-40">Mark all read</button>
        </div>
        <div className="mt-5 flex gap-2" role="tablist" aria-label="Notification filters">
          {filters.map((item) => <button key={item.id} type="button" role="tab" aria-selected={filter === item.id} onClick={() => setFilter(item.id)} className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${filter === item.id ? 'bg-slate-950 text-white' : 'bg-white text-slate-600 ring-1 ring-inset ring-slate-200 hover:ring-teal-300'}`}>{item.label}{item.id === 'unread' && unreadCount > 0 ? ` ${unreadCount}` : ''}</button>)}
        </div>
      </div>
      {feedback && <p className="border-b border-teal-100 bg-teal-50 px-5 py-3 text-sm text-teal-800" role="status">{feedback}</p>}
      <div className="divide-y divide-slate-100">
        {visibleItems.length === 0 ? <div className="p-10 text-center"><CheckCircleIcon className="mx-auto h-10 w-10 text-emerald-500" /><p className="mt-3 font-medium text-slate-900">Nothing new here</p><p className="mt-1 text-sm text-slate-500">New appointment, billing, and care updates will appear here.</p></div> : visibleItems.map((item) => {
          const Icon = notificationIcon(item.type);
          return <article key={item.id} className={`flex gap-4 p-5 transition sm:p-6 ${item.read ? 'bg-white' : 'bg-teal-50/50'}`}>
            <div className={`mt-0.5 rounded-2xl p-2.5 ${item.read ? 'bg-slate-100 text-slate-500' : 'bg-teal-100 text-teal-700'}`}><Icon className="h-5 w-5" /></div>
            <div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><p className="text-xs font-bold uppercase tracking-[0.14em] text-teal-700">{item.type.replaceAll('_', ' ')}</p>{!item.read && <span className="h-2 w-2 rounded-full bg-teal-500" aria-label="Unread" />}</div><p className="mt-2 text-sm leading-6 text-slate-700">{item.message}</p><p className="mt-2 text-xs text-slate-400">{formatDate(item.created_at)}</p></div>
            {!item.read && <button type="button" onClick={() => markRead(item.id)} disabled={isUpdating} className="self-start whitespace-nowrap text-xs font-semibold text-teal-700 hover:text-teal-950 disabled:opacity-50">Mark read</button>}
          </article>;
        })}
      </div>
    </section>
  );
}
