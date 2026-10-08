import { auth } from '@/auth';
import { getDashboardHome } from '@/app/lib/access-control';
import AcmeLogo from '@/app/ui/acme-logo';
import HomeHero from '@/app/ui/home-hero';
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
        <Link href="/" aria-label="Medi-Clinic home">
          <AcmeLogo className="h-20 w-20 object-contain" />
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
        <HomeHero
          destination={destination}
          isLoggedIn={!!session?.user}
        />

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
