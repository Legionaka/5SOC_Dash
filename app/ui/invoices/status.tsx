import { CheckIcon, ClockIcon } from '@heroicons/react/24/outline';
import clsx from 'clsx';

export default function InvoiceStatus({ status }: { status: string }) {
  return (
    <span
      className={clsx(
        'inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold',
        {
          'bg-amber-50 text-amber-700 ring-1 ring-inset ring-amber-200': status === 'pending',
          'bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-200': status === 'paid',
        },
      )}
    >
      {status === 'pending' ? (
        <>
          Pending
          <ClockIcon className="h-4 w-4" aria-hidden="true" />
        </>
      ) : null}
      {status === 'paid' ? (
        <>
          Paid
          <CheckIcon className="h-4 w-4" aria-hidden="true" />
        </>
      ) : null}
    </span>
  );
}
