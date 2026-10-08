import { auth } from '@/auth';
import { getDashboardHome } from '@/app/lib/access-control';
import AcmeLogo from '@/app/ui/acme-logo';
import HomeHero from '@/app/ui/home-hero';
import HomeSignInButton from '@/app/ui/home-sign-in-button';
import ImageCarousel from '@/app/ui/image-carousel';
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
        {session?.user ? (
          <Link
            href={destination}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:border-teal-700 hover:text-teal-800"
          >
            Go to your workspace
            <ArrowRightIcon className="h-4 w-4" />
          </Link>
        ) : (
          <HomeSignInButton />
        )}
      </header>

      <section className="mx-auto grid min-h-[calc(100vh-88px)] w-full max-w-7xl items-center gap-12 px-6 pb-16 pt-8 md:grid-cols-2 md:px-10 md:pb-24">
        <HomeHero
          destination={destination}
          isLoggedIn={!!session?.user}
        />

        <ImageCarousel
          images={[
            '/images/doctor-patient-consultation.jpg',
            '/images/doctor-clipboard.jpg',
            '/images/doctor-handshake.jpg',
            '/images/doctor-care.jpg',
          ]}
          interval={5000}
        />
      </section>

      <footer className="border-t border-slate-100 px-6 py-5 text-center text-sm text-slate-500">
        Medi-Clinic · Staff and patient portal
      </footer>
    </main>
  );
}
