'use client';

export default function HomeSignInButton() {
  return (
    <button
      type="button"
      onClick={() => window.dispatchEvent(new Event('medi-clinic:show-login'))}
      className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:border-teal-700 hover:text-teal-800"
    >
      Sign in
      <svg
        aria-hidden="true"
        viewBox="0 0 20 20"
        fill="currentColor"
        className="h-4 w-4"
      >
        <path
          fillRule="evenodd"
          d="M3.5 10a.75.75 0 0 1 .75-.75h9.69L10.72 6.03a.75.75 0 1 1 1.06-1.06l4.5 4.5a.75.75 0 0 1 0 1.06l-4.5 4.5a.75.75 0 1 1-1.06-1.06l3.22-3.22H4.25A.75.75 0 0 1 3.5 10Z"
          clipRule="evenodd"
        />
      </svg>
    </button>
  );
}
