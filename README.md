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

### Reset demo accounts with SQL

For a disposable demo project, run
`supabase/demo-accounts.sql` in the Supabase SQL editor after the application
schema and migrations `0001`, `0002`, and `0003` have been applied. It
permanently purges all Supabase Auth users and application user profiles, then
creates one account for every dashboard role. Do not run it against production
or a database with real patient data.

Demo login credentials:

| Dashboard | Email | Password |
| --- | --- | --- |
| Admin | `admin@medi-clinic.com` | `MediAdmin!2026` |
| Doctor | `doctor@medi-clinic.com` | `MediDoctor!2026` |
| Nurse | `nurse@medi-clinic.com` | `MediNurse!2026` |
| Patient | `user@nextmail.com` | `MediPatient!2026` |
| Pharmacy reception | `reception@medi-clinic.com` | `MediReception!2026` |
| Pharmacy stock | `stocker@medi-clinic.com` | `MediStocker!2026` |
| Pharmacist | `pharmacist@medi-clinic.com` | `MediPharmacist!2026` |

These credentials are intentionally public because this is a demo project.
Replace them and rotate all accounts before any deployment with real data.

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

## Security hardening

Apply `supabase/migrations/0003_security_hardening.sql` after the RLS migration.
It adds account lifecycle fields, permission mappings, audit metadata, indexes,
and append-only audit-log triggers. Staff administrators can disable accounts,
reset temporary passwords, and revoke all Supabase sessions from the staff
directory. The application also sends baseline security headers from
`next.config.ts`.

Enable MFA, email policies, breached-password protection, SMTP, and rate limits
in the Supabase dashboard before production. These provider controls cannot be
enabled by this repository migration alone. Remove or disable the development
seed route in production and keep `SUPABASE_SERVICE_ROLE_KEY` server-only.

## Invoice PDFs

Invoices can be downloaded from the admin and patient invoice screens. The
authenticated `/api/invoices/[id]/pdf` route checks role or patient ownership,
generates a branded PDF with PDFKit, and records the download in `audit_logs`.
PDFs are generated on demand and returned with private, non-cacheable headers.
