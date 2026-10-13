# Medi-Clinic Capstone Demo

**Demo day:** Wednesday, 14 October 2026  
**Panel chair:** Tristin  
**Slot:** 10 minutes: up to 5 minutes for the demo, questions, then changeover. Stop the demo by 6:00.

## Current readiness

This is a source review, not a live production check. The project is a role-based clinic portal with patient appointments and records, staff workflows, invoices, and pharmacy features. The README documents Supabase Auth, database setup, role routes, demo accounts, and local run configuration.

| Check | Status | What the repository shows / what to do |
|---|---|---|
| 1. Production URL works signed out and signed in | **Verify live** | No production URL is documented in the README. Add the deployed URL after checking it in a private window, then sign in and confirm the correct dashboard opens. |
| 2. README has live link, demo login, and run steps | **Partly ready; verify live** | README now has a project summary, stack rationale, limitations, next steps, and local run instructions. Add a production URL and verify demo logins when a deployment is available. |
| 3. Login protects `/dashboard` | **Implemented; smoke-test** | The dashboard layout redirects without a session, and role checks restrict dashboard routes. Verify the redirect in the deployed app. |
| 4. Entity 1 create, edit, delete, list | **Implemented; smoke-test** | Invoices have create, update, delete, and list flows. Demonstrate these with a disposable demo invoice. |
| 5. Entity 2 linked by foreign key, with CRUD | **Implemented in schema; apply migration** | `0004_invoice_customer_fk.sql` adds and validates the `invoices.customer_id` foreign key to `customers.id`. Apply it to the demo database, confirm validation succeeds, then demonstrate invoice CRUD and customer selection. |
| 6. RLS proof using a second user | **Not yet proven** | The repository includes RLS policies and application authorization checks. Run and record the two-user checks against the deployed Supabase API; the app data layer uses a separate server-side PostgreSQL connection. |
| 7. Chart 1 title asks a question, axes labelled, zero baseline | **Implemented in source; verify data live** | Revenue chart asks how monthly revenue changed, labels revenue in ZAR and month, shows a zero baseline, and includes a decision note. Confirm deployed data is current and meaningful. |
| 8. Chart 2 is a different shape and answers a second question | **Implemented in source; verify data live** | Admin dashboard now has a donut chart asking about today's appointment status mix, with counts and percentages. Confirm it renders against deployed data. |
| 9. Proposal exists in the repository | **Present and updated** | `misc/proposal.md` states the intended audience, the two chart questions, and which proposal features are still future work. |
| 10. Smoke test, secret check, latest deploy | **Partly ready; verify live** | `git ls-files` lists `.env.example`, not `.env.local`. Tick the smoke checks in README, confirm the last commit is deployed and Vercel says Ready, and make sure no credentials or keys were committed. The README currently contains public demo credentials, so rotate them before any real-data deployment. |

### Two things to complete before the freeze

1. Add and verify the production URL; apply `0004_invoice_customer_fk.sql` to the demo database and record the successful constraint check.
2. Perform the smoke checks with two distinct accounts against the deployed environment. Do not describe RLS isolation as proven until those checks pass.

## Five-minute demo script

| Time | Say / show |
|---|---|
| 0:00–0:30 — Hook | “Medi-Clinic is a role-based clinic portal for patients and care teams. It brings appointments, clinical follow-up, and billing into one place.” |
| 0:30–1:00 — Problem | “When clinic work is split across separate lists and messages, staff can miss handoffs and patients struggle to follow what happens next. This portal gives each role a focused view of its work.” |
| 1:00–3:30 — Live walk | Open the **production URL** while signed out and show the login page. Sign in with the demo admin account. Create a disposable invoice for a demo customer, edit its amount or status, and show it in the invoice list. Point out the revenue chart, then sign out. Keep the path practiced and use no real patient data. |
| 3:30–4:15 — One decision | “I kept role checks on the server and tied each dashboard route to the signed-in user’s role. That lets the app send people to the workflow meant for them and check access before showing protected pages.” |
| 4:15–5:00 — Limits and next steps | “Two limits today: the dashboard has only one basic revenue chart, and I still need a recorded two-user RLS proof in production. Next I would add the second chart, complete the two-user isolation checks, and improve the README/proposal with the live link and evidence.” |

**Timing target:** finish the walkthrough in 4:30–5:00, leaving time for questions within the 10-minute slot. Narrate the purpose of each step rather than reading clicks aloud. Stop by 5:30 even if something goes wrong; use the backup recording if the live service fails.

## Backup recording

Record a 60–90 second happy path from the deployed app: login page, sign in, create and edit one disposable invoice, show the chart, sign out. Use demo data only. Save the recording where the panel can access it, and test playback before the session. It backs up the live walkthrough; it does not replace the live demo.

## README content to add

1. **What it does:** a two- or three-sentence description of Medi-Clinic and its users.
2. **Live demo:** production URL and demo login instructions; keep variable names in the README, never secret values.
3. **Run it:** prerequisites, environment variable names, database setup, and start command.
4. **Stack and why:** Next.js/React for the app, Supabase Auth for sessions, Postgres for relational records, and the chosen styling/tooling.
5. **Known limitations:** live deployment and two-user isolation have not been verified; see the proposal for features still planned.
6. **Next:** verify the deployment, run the two-user checks, and record the invoice foreign-key migration result.

The README now documents the project, stack, local run steps, limitations, and next steps. A production URL and live verification results remain to be added. Check that only `.env.example` is tracked and contains placeholders before sharing.

## Viva practice

Use these as starting points and put the answers in your own words.

**How does a user’s data stay private from other users?**  
“The app gets the signed-in session on the server, checks the account role before rendering protected routes, and scopes patient data queries to the patient’s email. The database also has RLS policies for authenticated access. I would only claim database isolation is proven after showing the two-user checks against the deployed setup, because the app’s server-side database connection can use a different access path.”

**What was the hardest bug?**  
“The hardest area was making the login identity, the app’s role record, and the correct dashboard agree. Supabase Auth establishes the session, while the app profile supplies the role. I had to keep that link on the server so a user could not choose a role just by changing the page URL.”

If the panel asks about RLS, foreign keys, or charts, describe only what you tested. Say what remains to be verified rather than guessing.

## Freeze-day checklist

- [ ] Production URL opens in a private window and shows login while signed out.
- [ ] Demo account signs in and lands on its intended dashboard.
- [ ] Create, edit, delete, and list one disposable invoice.
- [ ] Demonstrate invoice/customer linking; verify the database foreign key.
- [ ] Test account two cannot see account one’s records or open its edit URL.
- [ ] Run the authorized database-policy check and record the result; do not improvise destructive SQL during the demo.
- [ ] Update README smoke-test ticks, live link, and demo login directions.
- [ ] Confirm `.env.example` is the only tracked env file and contains placeholders.
- [ ] Confirm the newest Vercel production deployment is Ready and includes the demo commit.
- [ ] Record and play back the 60–90 second backup.
- [ ] Keep the demo to five minutes and leave the rest of the slot for questions/changeover.
