import AcmeLogo from '@/app/ui/acme-logo';
import LoginForm from '@/app/ui/login-form';
import { Suspense } from 'react';

export default function LoginPage() {
  return (
    <main className="flex items-center justify-center md:h-screen">
      <div className="relative mx-auto flex w-full max-w-[400px] flex-col space-y-2.5 p-4 md:-mt-32">
        <div className="flex h-28 w-full items-center justify-center rounded-2xl border border-slate-200 bg-white p-3 shadow-lg shadow-teal-900/10 md:h-40">
          <AcmeLogo className="h-24 w-24 object-contain md:h-36 md:w-36" />
        </div>
        <Suspense>
          <LoginForm />
        </Suspense>
      </div>
    </main>
  );
}
