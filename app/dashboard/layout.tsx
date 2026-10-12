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

  const sidenavPropTypes = {
    role: typeof session.user.role,
    name: typeof session.user.name,
    email: typeof session.user.email,
  };
  // #region agent log
  fetch('http://127.0.0.1:7826/ingest/f67fa5db-0508-44bf-803c-d13bfd7999ec',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'7d5deb'},body:JSON.stringify({sessionId:'7d5deb',runId:'pre-fix',hypothesisId:'D',location:'app/dashboard/layout.tsx',message:'sidenav props types',data:sidenavPropTypes,timestamp:Date.now()})}).catch(()=>{});
  // #endregion

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
