import type { NextAuthConfig } from 'next-auth';
import {
  canAccessDashboardRoute,
  getDashboardHome,
} from '@/app/lib/access-control';
import { isUserRole } from '@/app/lib/definitions';

export const authConfig = {
  pages: {
    signIn: '/login',
  },
  providers: [
    // added later in auth.ts since it requires bcrypt which is only compatible with Node.js
    // while this file is also used in non-Node.js environments
  ],
  callbacks: {
    jwt({ token, user }) {
      if (user) token.role = user.role;
      return token;
    },
    session({ session, token }) {
      if (session.user) {
        session.user.role = isUserRole(token.role) ? token.role : undefined;
      }
      return session;
    },
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user;
      const isOnDashboard = nextUrl.pathname.startsWith('/dashboard');
      if (isOnDashboard) {
        if (!isLoggedIn) return false;

        const role = auth.user.role;
        const email = auth.user.email;
        if (nextUrl.pathname === '/dashboard' && role !== 'admin') {
          const home = getDashboardHome(role);
          if (home !== '/unauthorized') {
            return Response.redirect(new URL(home, nextUrl));
          }
        }

        if (!canAccessDashboardRoute(role, email, nextUrl.pathname)) {
          return Response.redirect(new URL('/unauthorized', nextUrl));
        }
        return true;
      }

      if (nextUrl.pathname === '/login' && isLoggedIn) {
        return Response.redirect(
          new URL(getDashboardHome(auth.user.role), nextUrl),
        );
      }
      return true;
    },
  },
} satisfies NextAuthConfig;
