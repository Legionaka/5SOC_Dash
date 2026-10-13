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
      if (user) {
        token.role = user.role;
        (token as typeof token & { mustChangePassword?: boolean }).mustChangePassword = user.mustChangePassword;
      }
      return token;
    },
    session({ session, token }) {
      if (session.user) {
        session.user.role = isUserRole(token.role) ? token.role : undefined;
        session.user.mustChangePassword = (token as typeof token & { mustChangePassword?: boolean }).mustChangePassword === true;
      }
      return session;
    },
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user;
      // Normalize the pathname so a deployment that adds a trailing slash does
      // not bypass the generic-dashboard redirect or access checks.
      const pathname = nextUrl.pathname.replace(/\/+$/, '') || '/';
      const isOnDashboard = pathname.startsWith('/dashboard');
      if (pathname === '/change-password') {
        if (!isLoggedIn) return false;
        if (auth.user.mustChangePassword !== true) {
          return Response.redirect(new URL(getDashboardHome(auth.user.role), nextUrl));
        }
        return true;
      }
      if (isOnDashboard) {
        if (!isLoggedIn) return false;
        if (auth.user.mustChangePassword === true) {
          return Response.redirect(new URL('/change-password', nextUrl));
        }

        const role = auth.user.role;
        const email = auth.user.email;
        if (pathname === '/dashboard' && role !== 'admin') {
          const home = getDashboardHome(role);
          if (home !== '/unauthorized') {
            return Response.redirect(new URL(home, nextUrl));
          }
        }

        if (!canAccessDashboardRoute(role, email, pathname)) {
          return Response.redirect(new URL('/unauthorized', nextUrl));
        }
        return true;
      }

      if (pathname === '/login' && isLoggedIn) {
        if (auth.user.mustChangePassword === true) {
          return Response.redirect(new URL('/change-password', nextUrl));
        }
        return Response.redirect(
          new URL(getDashboardHome(auth.user.role), nextUrl),
        );
      }
      return true;
    },
  },
} satisfies NextAuthConfig;
