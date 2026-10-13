import { auth } from '@/auth';
import { getDashboardHome } from '@/app/lib/access-control';
import AcmeLogo from '@/app/ui/acme-logo';
import HomeHero from '@/app/ui/home-hero';
import HomeSignInButton from '@/app/ui/home-sign-in-button';
import { ArrowUpRightIcon, CalendarDaysIcon, HeartIcon, ShieldCheckIcon } from '@heroicons/react/24/outline';
import Image from 'next/image';
import Link from 'next/link';

export default async function Page() {
  const session = await auth();
  const destination = session?.user
    ? getDashboardHome(session.user.role)
    : '/login';

  return (
    <main className="min-h-screen overflow-hidden bg-[#f5f4ef] text-[#152a2b]">
      <header className="relative z-10 mx-auto flex w-full max-w-[1440px] items-center justify-between px-5 py-5 sm:px-8 lg:px-14 lg:py-7">
        <Link href="/" aria-label="Medi-Clinic home" className="flex items-center gap-3">
          <AcmeLogo className="h-12 w-12 object-contain sm:h-14 sm:w-14" />
          <span className="hidden text-xs font-semibold uppercase tracking-[0.2em] text-[#607373] sm:block">Care, connected</span>
        </Link>
        <div className="flex items-center gap-4">
          <span className="hidden text-sm text-[#607373] md:block">A clearer way to care</span>
          {session?.user ? (
            <Link href={destination} className="inline-flex min-h-11 items-center gap-2 rounded-full bg-[#163c3a] px-5 text-sm font-semibold text-white transition hover:bg-[#235451]">
              Open workspace <ArrowUpRightIcon className="h-4 w-4" />
            </Link>
          ) : <HomeSignInButton />}
        </div>
      </header>

      <section className="relative mx-auto grid w-full max-w-[1440px] items-center gap-12 px-5 pb-14 pt-5 sm:px-8 md:gap-8 lg:min-h-[690px] lg:grid-cols-[0.88fr_1.12fr] lg:px-14 lg:pb-20 lg:pt-4">
        <div aria-hidden="true" className="pointer-events-none absolute -left-48 top-10 h-[30rem] w-[30rem] rounded-full border border-[#d9ded4]" />
        <div className="relative z-10">
          <div className="mb-7 inline-flex items-center gap-2 rounded-full border border-[#c9d7cf] bg-[#e9eee8] px-4 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-[#28605a]">
            <HeartIcon className="h-4 w-4" /> One clinic. Every role.
          </div>
          <HomeHero destination={destination} isLoggedIn={!!session?.user} />
          {!session?.user && <p className="mt-5 text-sm text-[#718080]">Secure access for patients and clinic teams.</p>}
          <div className="mt-10 flex flex-wrap gap-x-6 gap-y-3 border-t border-[#d9ded4] pt-5 text-sm text-[#4e6462]">
            <span className="inline-flex items-center gap-2"><CalendarDaysIcon className="h-4 w-4 text-[#367870]" /> Appointments</span>
            <span className="inline-flex items-center gap-2"><HeartIcon className="h-4 w-4 text-[#367870]" /> Patient care</span>
            <span className="inline-flex items-center gap-2"><ShieldCheckIcon className="h-4 w-4 text-[#367870]" /> Role-based access</span>
          </div>
        </div>

        <div className="relative mx-auto w-full max-w-[690px] lg:ml-auto">
          <div aria-hidden="true" className="absolute -right-12 -top-12 h-48 w-48 rounded-full bg-[#dce9dc] blur-2xl" />
          <div className="relative min-h-[390px] overflow-hidden rounded-[2rem] bg-[#d9e1d8] shadow-[0_28px_70px_-36px_rgba(25,55,50,0.48)] sm:min-h-[500px] lg:min-h-[570px]">
            <Image
              src="/images/doctor-patient-consultation.jpg"
              alt="A doctor speaking with a patient during a consultation"
              fill
              priority
              sizes="(max-width: 768px) 100vw, 54vw"
              className="object-cover object-center"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#112c2a]/60 via-transparent to-[#112c2a]/5" />
            <div className="absolute bottom-7 left-6 right-6 text-white sm:bottom-9 sm:left-9 sm:right-auto sm:max-w-sm">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-white/75">Made for the moments that matter</p>
              <p className="mt-2 text-2xl font-semibold leading-tight sm:text-3xl">More connected care, from first visit to follow-up.</p>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-3">
            <article className="rounded-2xl border border-[#e1e6df] bg-white p-4 shadow-[0_18px_35px_-24px_rgba(15,40,37,0.5)] sm:p-5">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#e9f1eb] text-[#28605a]"><CalendarDaysIcon className="h-5 w-5" /></span>
              <h2 className="mt-3 text-sm font-semibold text-[#193b39]">Appointments</h2>
              <p className="mt-1 text-xs leading-5 text-[#718080]">Keep the next step in view.</p>
            </article>
            <article className="rounded-2xl border border-[#e1e6df] bg-white p-4 shadow-[0_18px_35px_-24px_rgba(15,40,37,0.5)] sm:p-5">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#e9f1eb] text-[#28605a]"><ShieldCheckIcon className="h-5 w-5" /></span>
              <h2 className="mt-3 text-sm font-semibold text-[#193b39]">Your workspace</h2>
              <p className="mt-1 text-xs leading-5 text-[#718080]">The right tools for your role.</p>
            </article>
          </div>
        </div>
      </section>

      <footer className="mx-auto flex max-w-[1440px] flex-col gap-2 border-t border-[#d9ded4] px-5 py-5 text-xs text-[#718080] sm:flex-row sm:items-center sm:justify-between sm:px-8 lg:px-14">
        <span>Medi-Clinic · Staff and patient portal</span>
        <span>Care teams and patients, on the same page.</span>
      </footer>
    </main>
  );
}
