'use client';

import { lusitana } from '@/app/ui/fonts';
import LoginForm from '@/app/ui/login-form';
import { ArrowRightIcon, ShieldCheckIcon, XMarkIcon } from '@heroicons/react/24/outline';
import Link from 'next/link';
import { Suspense, useEffect, useState } from 'react';

export default function HomeHero({
  destination,
  isLoggedIn,
}: {
  destination: string;
  isLoggedIn: boolean;
}) {
  const [showLoginForm, setShowLoginForm] = useState(false);

  useEffect(() => {
    const showLoginFormFromHeader = () => setShowLoginForm(true);
    window.addEventListener('medi-clinic:show-login', showLoginFormFromHeader);
    return () => window.removeEventListener('medi-clinic:show-login', showLoginFormFromHeader);
  }, []);

  if (showLoginForm && !isLoggedIn) {
    return (
      <div className="max-w-xl">
        <div className="mb-6 flex items-center justify-between gap-4">
          <p className="inline-flex items-center gap-2 text-sm font-semibold text-[#28605a]"><ShieldCheckIcon className="h-5 w-5" /> Secure clinic sign-in</p>
          <button type="button" onClick={() => setShowLoginForm(false)} className="inline-flex h-10 items-center gap-2 rounded-full px-3 text-sm font-medium text-[#607373] transition hover:bg-white" aria-label="Close sign-in form">
            <XMarkIcon className="h-4 w-4" /> Back
          </button>
        </div>
        <h1 className={`${lusitana.className} text-4xl font-bold leading-tight tracking-tight text-[#173533] sm:text-5xl`}>
          Welcome back.<span className="block text-[#397b70]">Let’s pick up care.</span>
        </h1>
        <div className="mt-6 max-w-lg">
          <Suspense fallback={<div className="h-72 animate-pulse rounded-2xl bg-white/70" />}>
            <LoginForm embedded onCancel={() => setShowLoginForm(false)} />
          </Suspense>
        </div>
      </div>
    );
  }

  if (isLoggedIn) {
    return (
      <div className="max-w-xl">
        <p className="mb-5 inline-flex items-center gap-2 text-sm font-semibold text-[#28605a]"><ShieldCheckIcon className="h-5 w-5" /> Your clinic workspace is ready</p>
        <h1 className={`${lusitana.className} text-5xl font-bold leading-[1.02] tracking-tight text-[#173533] sm:text-6xl lg:text-7xl`}>
          Good care is a<span className="block text-[#397b70]">team effort.</span>
        </h1>
        <p className="mt-6 max-w-lg text-lg leading-8 text-[#607373]">Continue to the workspace matched to your clinic role and keep today’s work moving.</p>
        <Link href={destination} className="mt-8 inline-flex min-h-12 items-center gap-3 rounded-full bg-[#163c3a] px-6 text-sm font-semibold text-white shadow-lg shadow-[#163c3a]/15 transition hover:-translate-y-0.5 hover:bg-[#235451] focus:outline-none focus:ring-2 focus:ring-[#397b70] focus:ring-offset-2 focus:ring-offset-[#f5f4ef]">
          Open your workspace <ArrowRightIcon className="h-4 w-4" />
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-xl">
      <p className="mb-5 inline-flex items-center gap-2 text-sm font-semibold text-[#28605a]"><ShieldCheckIcon className="h-5 w-5" /> Thoughtful care, better connected</p>
      <h1 className={`${lusitana.className} text-5xl font-bold leading-[1.02] tracking-tight text-[#173533] sm:text-6xl lg:text-7xl`}>
        Care moves<span className="block text-[#397b70]">forward,</span><span className="block">together.</span>
      </h1>
      <p className="mt-6 max-w-lg text-lg leading-8 text-[#607373]">
        A calmer way for patients and clinic teams to manage appointments, follow-ups, and the details in between.
      </p>
      <button
        type="button"
        onClick={() => setShowLoginForm(true)}
        className="mt-8 inline-flex min-h-12 items-center gap-3 rounded-full bg-[#163c3a] px-6 text-sm font-semibold text-white shadow-lg shadow-[#163c3a]/15 transition hover:-translate-y-0.5 hover:bg-[#235451] focus:outline-none focus:ring-2 focus:ring-[#397b70] focus:ring-offset-2 focus:ring-offset-[#f5f4ef]"
      >
        Sign in to your clinic <ArrowRightIcon className="h-4 w-4" />
      </button>
      <p className="mt-3 text-xs text-[#718080]">Use the account details provided by your clinic.</p>
    </div>
  );
}
