# Medi-Clinic Dashboard

Medi-Clinic is a role-based clinic portal for patients and care teams. Patients
can manage appointments, view records and invoices, and use the wallet view;
staff dashboards support clinical workflows, scheduling, pharmacy operations,
and billing. The admin dashboard includes revenue and appointment-status
charts. This is a demonstration system and has not been verified for
production use with real patient data.

## Live demo

**Production URL:** Not configured in this repository. Add the deployed URL
after confirming it opens signed out and that each demo account reaches its
intended dashboard.

## Stack and why

- **Next.js App Router and React:** server-rendered role dashboards and route handlers.
- **Supabase Auth:** hosted identity, password management, and cookie sessions.
- **PostgreSQL:** relational application records and SQL reporting.
- **Tailwind CSS:** responsive styling.
- **PDFKit:** server-side invoice PDF generation.

The application uses server-rendered authorization and server actions. Its
data layer connects directly to PostgreSQL; RLS policies cover Supabase API
requests but do not prove isolation for that privileged connection.

## Database setup

Set `POSTGRES_URL`, `NEXT_PUBLIC_SUPABASE_URL`,
`NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, and `SUPABASE_SERVICE_ROLE_KEY` in
`.env.local`. Run the SQL in
`supabase/migrations/0001_supabase_auth_bridge.sql` in the Supabase SQL editor.
Create the remaining application tables through your schema deployment (or,
for local development only, the protected seed endpoint), then run
`supabase/migrations/0002_rls_policies.sql` to enable least-privilege Row Level
Security for every application table. Then apply migrations `0003_security_hardening.sql`
and `0004_invoice_customer_fk.sql`. The RLS migration expects all tables
created by `app/seed/route.ts` to already exist. The invoice/customer migration
validates existing records and fails if an invoice references a missing customer.

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

For a disposable demo project, first run
`supabase/demo-accounts.sql` in the Supabase SQL editor to remove any Auth
users created by the old direct-insert script. Then run this from the project
root:

`npm run auth:import-users -- --purge-existing --demo-passwords`

The import command uses the Supabase Admin Auth API for valid Auth accounts and
the configured `POSTGRES_URL` for application profiles. This matters when
Supabase Auth and the application database are separate services, as they are
in this project. Do not run the purge against production or a database with
real patient data.

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

## Known limitations and next steps

- Validate chart data and labels against the deployed database before
  presenting them as operational evidence.
- Two-user isolation still needs a check against the deployed Supabase API
  using separate accounts. The server-side SQL connection uses a separate
  privileged path protected by application authorization checks.
- No production URL or deployment verification is recorded in this repository.
- Provider-side MFA, email, breached-password, SMTP, and rate-limit settings
  require configuration in Supabase.
- [`misc/proposal.md`](misc/proposal.md) describes planned integrations and
  controls that are not all implemented; see its status section.

Next steps: configure and smoke-test a deployed URL, record two-user access
checks against Supabase, and implement or defer the remaining proposal items.

## Local run

Prerequisites: Node.js, npm, PostgreSQL, and a Supabase project.

1. Install dependencies with `npm install`.
2. Configure the environment variables described under Database setup in
   `.env.local`.
3. Apply the SQL migrations in order after creating the application tables.
4. Start the development server with `npm run dev` and open
   `http://localhost:3000`.

For optional sample data, follow the protected seed endpoint instructions
above. Never use purge/reset options against a production or real-data database.
