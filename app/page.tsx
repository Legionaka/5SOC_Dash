import { auth } from '@/auth';
import { getDashboardHome } from '@/app/lib/access-control';
import { lusitana } from '@/app/ui/fonts';
import {
  ArrowRightIcon,
  HeartIcon,
  ShieldCheckIcon,
  UserGroupIcon,
} from '@heroicons/react/24/outline';
import Link from 'next/link';

export default async function Page() {
  const session = await auth();
  const destination = session?.user
    ? getDashboardHome(session.user.role)
    : '/login';

  return (
    <main className="min-h-screen bg-white text-slate-900">
      <header className="mx-auto flex w-full max-w-7xl items-center justify-between px-6 py-6 md:px-10">
        <Link href="/" className="flex items-center gap-3" aria-label="Medi-Clinic home">
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-teal-700 text-white">
            <HeartIcon className="h-6 w-6" />
          </span>
          <span className={`${lusitana.className} text-2xl font-bold`}>
            Medi-Clinic
          </span>
        </Link>
        <Link
          href={destination}
          className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:border-teal-700 hover:text-teal-800"
        >
          {session?.user ? 'Go to your workspace' : 'Sign in'}
          <ArrowRightIcon className="h-4 w-4" />
        </Link>
      </header>

      <section className="mx-auto grid min-h-[calc(100vh-88px)] w-full max-w-7xl items-center gap-12 px-6 pb-16 pt-8 md:grid-cols-2 md:px-10 md:pb-24">
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
            Sign in to continue to the workspace assigned to your account.
            Access is based on your clinic role.
          </p>
          <Link
            href={destination}
            className="mt-9 inline-flex items-center gap-3 rounded-lg bg-teal-700 px-6 py-3.5 text-base font-semibold text-white shadow-sm transition hover:bg-teal-800 focus:outline-none focus:ring-2 focus:ring-teal-700 focus:ring-offset-2"
          >
            {session?.user ? 'Open your workspace' : 'Sign in to continue'}
            <ArrowRightIcon className="h-5 w-5" />
          </Link>
          <p className="mt-4 text-sm text-slate-500">
            Use the account credentials provided by your clinic.
          </p>
        </div>

        <div className="relative mx-auto w-full max-w-lg">
          <div className="absolute -inset-5 rounded-[2rem] bg-gradient-to-br from-teal-100 via-cyan-50 to-sky-100" />
          <div className="relative overflow-hidden rounded-3xl border border-teal-100 bg-white p-7 shadow-xl shadow-teal-900/10 sm:p-10">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-teal-700 text-white">
              <HeartIcon className="h-8 w-8" />
            </div>
            <h2 className={`${lusitana.className} mt-7 text-2xl font-bold`}>
              One sign-in. The right workspace.
            </h2>
            <p className="mt-3 leading-7 text-slate-600">
              Your account role determines which areas of the clinic portal
              you can access.
            </p>

            <div className="mt-8 space-y-3">
              <div className="flex items-center gap-4 rounded-xl bg-slate-50 p-4">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-white text-teal-700 shadow-sm">
                  <UserGroupIcon className="h-5 w-5" />
                </span>
                <div>
                  <p className="font-semibold text-slate-800">
                    Role-based access
                  </p>
                  <p className="mt-0.5 text-sm text-slate-500">
                    Patient, clinical, pharmacy, and admin areas
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-4 rounded-xl bg-slate-50 p-4">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-white text-teal-700 shadow-sm">
                  <ShieldCheckIcon className="h-5 w-5" />
                </span>
                <div>
                  <p className="font-semibold text-slate-800">
                    Account-protected pages
                  </p>
                  <p className="mt-0.5 text-sm text-slate-500">
                    Sign in to access your permitted workspace
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <footer className="border-t border-slate-100 px-6 py-5 text-center text-sm text-slate-500">
        Medi-Clinic · Staff and patient portal
      </footer>
    </main>
  );
}
