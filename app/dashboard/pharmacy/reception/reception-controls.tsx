'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { recordInPersonPayment } from '@/app/lib/pharmacy-actions';
import { updateAppointmentCheckIn } from '@/app/lib/doctor-actions';

export function ReceptionCheckIn({ id, initialStatus }: { id: string; initialStatus: string }) {
  const [status, setStatus] = useState(initialStatus);
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const router = useRouter();
  async function update(value: string) {
    setBusy(true);
    const result = await updateAppointmentCheckIn(id, value);
    setBusy(false);
    setMessage(result.message);
    if (result.success) { setStatus(value); router.refresh(); }
  }
  return <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
    <select aria-label="Check-in status" value={status} disabled={busy} onChange={(event) => update(event.target.value)} className="min-h-11 w-full rounded-lg border border-slate-300 px-3 text-sm sm:w-auto">
      <option>Not checked in</option><option>Checked in</option>
    </select>
    {message && <span role="status" className="text-xs text-slate-500">{message}</span>}
  </div>;
}

export function RecordCashPayment({ invoiceId }: { invoiceId: string }) {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const router = useRouter();
  async function pay() {
    setBusy(true);
    const result = await recordInPersonPayment(invoiceId);
    setBusy(false);
    setMessage(result.message);
    if (result.success) router.refresh();
  }
  return <div className="flex flex-col items-start gap-2 sm:flex-row sm:items-center">
    <button type="button" disabled={busy} onClick={pay} className="min-h-11 w-full rounded-lg bg-teal-700 px-3 text-sm font-semibold text-white disabled:opacity-50 sm:w-auto">{busy ? 'Recording…' : 'Record in-person payment'}</button>
    {message && <span role="status" className="text-xs text-slate-600">{message}</span>}
  </div>;
}
