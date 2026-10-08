'use client';

import { lusitana } from '@/app/ui/fonts';
import LoginForm from '@/app/ui/login-form';
import { ArrowRightIcon, ShieldCheckIcon } from '@heroicons/react/24/outline';
import Link from 'next/link';
import { Suspense, useState } from 'react';

export default function HomeHero({
  destination,
  isLoggedIn,
}: {
  destination: string;
  isLoggedIn: boolean;
}) {
  const [showLoginForm, setShowLoginForm] = useState(false);

  if (isLoggedIn) {
    return (
      <div className="max-w-xl">
        <p className="mb-5 inline-flex items-center gap-2 rounded-full bg-teal-50 px-3 py-1.5 text-sm font-semibold text-teal-800">
          <ShieldCheckIcon className="h-4 w-4" />
          A dedicated workspace for every role
        </p>
        <h1
          className={`${lusitana.className} text-4xl font-bold leading-tight tracking-tight text-slate-950 sm:text-5xl md:text-6xl`}
        >
          Welcome to your
          <span className="block text-teal-700">Medi-Clinic portal.</span>
        </h1>
        <p className="mt-6 max-w-lg text-lg leading-8 text-slate-600">
          Your account is signed in. Continue to the workspace assigned to your
          clinic role.
        </p>
        <Link
          href={destination}
          className="mt-9 inline-flex items-center gap-3 rounded-lg bg-teal-700 px-6 py-3.5 text-base font-semibold text-white shadow-sm transition hover:bg-teal-800 focus:outline-none focus:ring-2 focus:ring-teal-700 focus:ring-offset-2"
        >
          Open your workspace
          <ArrowRightIcon className="h-5 w-5" />
        </Link>
      </div>
    );
  }

  if (showLoginForm) {
    return (
      <div className="max-w-xl">
        <p className="mb-5 inline-flex items-center gap-2 rounded-full bg-teal-50 px-3 py-1.5 text-sm font-semibold text-teal-800">
          <ShieldCheckIcon className="h-4 w-4" />
          A dedicated workspace for every role
        </p>
        <h1
          className={`${lusitana.className} text-4xl font-bold leading-tight tracking-tight text-slate-950 sm:text-5xl md:text-6xl`}
        >
          Welcome to your
          <span className="block text-teal-700">Medi-Clinic portal.</span>
        </h1>
        <div className="mt-6 max-w-lg">
          <Suspense>
            <LoginForm
              embedded
              onCancel={() => setShowLoginForm(false)}
            />
          </Suspense>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-xl">
      <p className="mb-5 inline-flex items-center gap-2 rounded-full bg-teal-50 px-3 py-1.5 text-sm font-semibold text-teal-800">
        <ShieldCheckIcon className="h-4 w-4" />
        A dedicated workspace for every role
      </p>
      <h1
        className={`${lusitana.className} text-4xl font-bold leading-tight tracking-tight text-slate-950 sm:text-5xl md:text-6xl`}
      >
        Welcome to your
        <span className="block text-teal-700">Medi-Clinic portal.</span>
      </h1>
      <p className="mt-6 max-w-lg text-lg leading-8 text-slate-600">
        Sign in to continue to the workspace assigned to your account. Access
        is based on your clinic role.
      </p>
      <button
        type="button"
        onClick={() => setShowLoginForm(true)}
        className="mt-9 inline-flex items-center gap-3 rounded-lg bg-teal-700 px-6 py-3.5 text-base font-semibold text-white shadow-sm transition hover:bg-teal-800 focus:outline-none focus:ring-2 focus:ring-teal-700 focus:ring-offset-2"
      >
        Sign in to continue
        <ArrowRightIcon className="h-5 w-5" />
      </button>
      <p className="mt-4 text-sm text-slate-500">
        Use the account credentials provided by your clinic.
      </p>
    </div>
  );
}
