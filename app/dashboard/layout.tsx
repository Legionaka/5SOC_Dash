import SideNav from '@/app/ui/dashboard/sidenav';
import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import TopBar from '@/app/ui/dashboard/top-bar';

export default async function Layout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session?.user) redirect('/');

  return (
    <div className="flex min-h-screen flex-col bg-slate-50 md:h-screen md:flex-row md:overflow-hidden">
    <SideNav
      role={session.user.role}
      name={session.user.name}
      email={session.user.email}
    />
    <div className="min-w-0 grow overflow-y-auto p-4 sm:p-6 md:p-8 lg:p-10">
      <div className="mx-auto w-full max-w-[1440px]">
        <TopBar name={session.user.name} role={session.user.role} />
        {children}
      </div>
    </div>
    </div>
  );
}
