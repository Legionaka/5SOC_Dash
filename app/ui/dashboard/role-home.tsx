import { auth } from '@/auth';
import type { UserRole } from '@/app/lib/definitions';
import { redirect } from 'next/navigation';
import { lusitana } from '@/app/ui/fonts';

export default async function RoleHome({
  roles,
  title,
  description,
}: {
  roles: readonly UserRole[];
  title: string;
  description: string;
}) {
  const session = await auth();
  if (!session?.user) redirect('/login');
  if (!session.user.role || !roles.includes(session.user.role)) {
    redirect('/unauthorized');
  }

  return (
    <main>
      <h1 className={`${lusitana.className} mb-4 text-xl md:text-2xl`}>
        {title}
      </h1>
      <p className="text-sm text-gray-600">{description}</p>
    </main>
  );
}
