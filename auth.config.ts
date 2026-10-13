// Supabase owns authentication and session refresh. Dashboard role mapping and
// authorization remain in access-control.ts and server-side route guards.
export const authConfig = {
  signInPath: '/login',
  protectedPrefixes: ['/dashboard', '/change-password'],
} as const;
