'use client';

import { useEffect, useState } from 'react';

export default function HeroVideo() {
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    const updatePreference = () => setReducedMotion(mediaQuery.matches);
    updatePreference();
    mediaQuery.addEventListener('change', updatePreference);
    return () => mediaQuery.removeEventListener('change', updatePreference);
  }, []);

  return (
    <div className="relative mx-auto w-full max-w-6xl">
      <div className="absolute -inset-5 rounded-[2rem] bg-gradient-to-br from-teal-100 via-cyan-50 to-sky-100" aria-hidden="true" />
      <div className="relative overflow-hidden rounded-3xl bg-slate-900 shadow-xl shadow-teal-900/10">
        <video
          className="h-[420px] w-full object-cover sm:h-[500px]"
          src="/videos/143376-782178665_medium.mp4"
          poster="/images/doctor-patient-consultation.jpg"
          autoPlay={!reducedMotion}
          muted
          loop
          playsInline
          preload="metadata"
          aria-label="Medi-Clinic care team providing patient care"
        />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-slate-950/75 via-slate-950/10 to-teal-950/10" aria-hidden="true" />
        <div className="absolute bottom-5 left-5 right-5 rounded-2xl border border-white/20 bg-white/90 p-4 backdrop-blur sm:bottom-6 sm:left-6 sm:right-auto sm:max-w-xs">
          <p className="text-sm font-semibold text-slate-900">Connected care, one secure portal</p>
          <p className="mt-1 text-xs leading-5 text-slate-600">Access the workspace designed for your clinic role.</p>
        </div>
      </div>
    </div>
  );
}
