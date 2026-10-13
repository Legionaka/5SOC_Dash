# Medi-Clinic Dashboard

This project uses Supabase Auth for passwords and cookie-based sessions. The
application role remains in the server-side `users` record and controls which
dashboard a signed-in user can access.

## Database setup

Set `POSTGRES_URL`, `NEXT_PUBLIC_SUPABASE_URL`,
`NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, and `SUPABASE_SERVICE_ROLE_KEY` in
`.env.local`. Run the SQL in
`supabase/migrations/0001_supabase_auth_bridge.sql` in the Supabase SQL editor.
Create the remaining application tables through your schema deployment (or,
for local development only, the protected seed endpoint), then run
`supabase/migrations/0002_rls_policies.sql` to enable least-privilege Row Level
Security for every application table. The RLS migration expects all tables
created by `app/seed/route.ts` to already exist.

For local development only, set `SEED_SECRET` and call `/seed` with the
`x-seed-secret` header to create the application tables and sample data. The
seed endpoint is disabled in production.

Create or invite Auth users in Supabase, then create the matching application
profile through the admin staff screen. Existing demo users must be recreated
in Supabase Auth because their old application passwords are not Supabase Auth
credentials.

To provision every account from `supabase/users.csv`, run
`npm run auth:import-users`. The script uses the server-only service-role key,
creates missing Supabase Auth users with generated temporary passwords, links
their `auth_user_id`, and prints the temporary passwords once. Add
`--reset-existing` only when you intentionally want to reset existing Auth
user passwords.

## Role-protected routes

| Role | Dashboard entry |
| --- | --- |
| `admin` | `/dashboard`, including invoices and customers |
| `doctor` | `/dashboard/doctor` |
| `nurse` | `/dashboard/nurse` |
| `patient` | `/dashboard/user` |
| `pharmacy_reception` | `/dashboard/pharmacy/reception` |
| `pharmacy_stocker` | `/dashboard/pharmacy/stock` |
| `pharmacist` | `/dashboard/pharmacy/pharmacist` |

Authorization is enforced in server-rendered pages and server actions. The
Next.js proxy refreshes Supabase Auth cookies and blocks unauthenticated access
to protected routes.
