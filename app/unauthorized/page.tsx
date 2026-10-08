import Link from 'next/link';

export default function UnauthorizedPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 p-6 text-center">
      <h1 className="text-2xl font-semibold text-gray-900">
        You do not have access to this page.
      </h1>
      <p className="text-sm text-gray-600">
        Sign in with an account that has the required role.
      </p>
      <Link className="text-blue-600 hover:underline" href="/">
        Return home
      </Link>
    </main>
  );
}
