'use client';

import { lusitana } from '@/app/ui/fonts';
import {
  AtSymbolIcon,
  KeyIcon,
  ExclamationCircleIcon,
} from '@heroicons/react/24/outline';
import { ArrowRightIcon } from '@heroicons/react/20/solid';
import { Button } from '@/app/ui/button';
import { useActionState } from 'react';
import { authenticate } from '@/app/lib/actions';
import { useSearchParams } from 'next/navigation';

export default function LoginForm({
  embedded = false,
  onCancel,
}: {
  embedded?: boolean;
  onCancel?: () => void;
}) {
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get('callbackUrl') || '/dashboard';
  const [errorMessage, formAction, isPending] = useActionState(
    authenticate,
    undefined,
  );

  return (
    <form action={formAction} className="space-y-3">
      <div
        className={
          embedded
            ? 'rounded-2xl border border-teal-100 bg-white p-5 shadow-xl shadow-teal-900/10 sm:p-6'
            : 'flex-1 rounded-lg bg-gray-50 px-6 pb-4 pt-8'
        }
      >
        <h1
          className={`${lusitana.className} mb-3 text-2xl font-bold text-slate-950`}
        >
          {embedded ? 'Sign in to your account' : 'Please log in to continue.'}
        </h1>
        {embedded && (
          <p className="mb-5 text-sm leading-6 text-slate-600">
            Enter the credentials provided by your clinic.
          </p>
        )}
        <div className="w-full">
          <div>
            <label
              className={`mb-2 mt-5 block text-sm font-medium ${embedded ? 'text-slate-700' : 'text-gray-900'}`}
              htmlFor="email"
            >
              Email
            </label>
            <div className="relative">
              <input
                className={`peer block w-full rounded-lg border py-3 pl-10 text-sm outline-none transition placeholder:text-slate-400 focus:ring-2 ${embedded ? 'border-slate-200 bg-white text-slate-900 focus:border-teal-700 focus:ring-teal-100' : 'border-gray-200 focus:border-blue-500 focus:ring-blue-100'}`}
                id="email"
                type="email"
                name="email"
                placeholder="Enter your email address"
                required
                autoComplete="email"
              />
              <AtSymbolIcon
                className={`pointer-events-none absolute left-3 top-1/2 h-[18px] w-[18px] -translate-y-1/2 ${embedded ? 'text-slate-400 peer-focus:text-teal-700' : 'text-gray-500 peer-focus:text-gray-900'}`}
              />
            </div>
          </div>
          <div className="mt-4">
            <label
              className={`mb-2 mt-5 block text-sm font-medium ${embedded ? 'text-slate-700' : 'text-gray-900'}`}
              htmlFor="password"
            >
              Password
            </label>
            <div className="relative">
              <input
                className={`peer block w-full rounded-lg border py-3 pl-10 text-sm outline-none transition placeholder:text-slate-400 focus:ring-2 ${embedded ? 'border-slate-200 bg-white text-slate-900 focus:border-teal-700 focus:ring-teal-100' : 'border-gray-200 focus:border-blue-500 focus:ring-blue-100'}`}
                id="password"
                type="password"
                name="password"
                placeholder="Enter password"
                required
                minLength={6}
                autoComplete="current-password"
              />
              <KeyIcon
                className={`pointer-events-none absolute left-3 top-1/2 h-[18px] w-[18px] -translate-y-1/2 ${embedded ? 'text-slate-400 peer-focus:text-teal-700' : 'text-gray-500 peer-focus:text-gray-900'}`}
              />
            </div>
          </div>
        </div>
        <input type="hidden" name="redirectTo" value={callbackUrl} />
        <Button
          className={`mt-5 w-full justify-center gap-2 rounded-lg py-3 ${embedded ? 'h-auto bg-teal-700 text-base font-semibold hover:bg-teal-800 focus-visible:outline-teal-700 active:bg-teal-900' : ''}`}
          aria-disabled={isPending}
          disabled={isPending}
        >
          {isPending ? (
            <>
              <span
                aria-hidden="true"
                className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white"
              />
              Signing in…
            </>
          ) : (
            <>
              {embedded ? 'Sign in' : 'Log in'}
              <ArrowRightIcon className="ml-auto h-5 w-5 text-gray-50" />
            </>
          )}
        </Button>
        <div
          className={`flex min-h-8 items-end space-x-1 ${embedded ? 'text-sm' : ''}`}
          aria-live="polite"
          aria-atomic="true"
          role="status"
        >
          {errorMessage && (
            <>
              <ExclamationCircleIcon
                className={`h-5 w-5 shrink-0 ${embedded ? 'text-rose-600' : 'text-red-500'}`}
              />
              <p className={embedded ? 'text-rose-700' : 'text-sm text-red-500'}>
                {errorMessage}
              </p>
            </>
          )}
        </div>
        {isPending && (
          <p
            role="status"
            aria-live="polite"
            className="mt-1 text-center text-sm text-slate-500"
          >
            Verifying your account and opening your workspace…
          </p>
        )}
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="mt-2 w-full rounded-lg px-4 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-100 hover:text-slate-900"
          >
            Back
          </button>
        )}
      </div>
    </form>
  );
}
