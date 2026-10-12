import SideNav from '@/app/ui/dashboard/sidenav';
import { auth } from '@/auth';
import { redirect } from 'next/navigation';

export default async function Layout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session?.user) redirect('/login');

  return (
    <div className="flex min-h-screen flex-col bg-slate-50 md:h-screen md:flex-row md:overflow-hidden">
    <SideNav
      role={session.user.role}
      name={session.user.name}
      email={session.user.email}
    />
    <div className="min-w-0 grow overflow-y-auto p-6 md:p-10 lg:p-12">
      {children}
    </div>
    </div>
  );
}
