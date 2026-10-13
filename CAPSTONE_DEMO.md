# Medi-Clinic Capstone Demo

**Demo day:** Wednesday, 14 October 2026  
**Panel chair:** Tristin  
**Slot:** 10 minutes: up to 5 minutes for the demo, questions, then changeover. Stop the demo by 6:00.

## Current readiness

This is a source review, not a live production check. The project is a role-based clinic portal with patient appointments and records, staff workflows, invoices, and pharmacy features. The README documents Supabase Auth, database setup, role routes, demo accounts, and local run configuration.

| Check | Status | What the repository shows / what to do |
|---|---|---|
| 1. Production URL works signed out and signed in | **Verify live** | No production URL is documented in the README. Add the deployed URL after checking it in a private window, then sign in and confirm the correct dashboard opens. |
| 2. README has live link, demo login, and run steps | **Approaching** | README has run/database setup and demo logins, but no live link or clear opening project summary, stack rationale, limitations, and next steps. Update its six sections before the freeze. |
| 3. Login protects `/dashboard` | **Implemented; smoke-test** | The dashboard layout redirects without a session, and role checks restrict dashboard routes. Verify the redirect in the deployed app. |
| 4. Entity 1 create, edit, delete, list | **Implemented; smoke-test** | Invoices have create, update, delete, and list flows. Demonstrate these with a disposable demo invoice. |
| 5. Entity 2 linked by foreign key, with CRUD | **Partly demonstrated** | Invoices link to customers through `customer_id`, and invoice forms select a customer. Use the invoice/customer relationship as the example; verify the database constraint and demonstrate the linked form. |
| 6. RLS proof using a second user | **Not yet proven** | The repository includes RLS policies and server-side role/ownership checks. The README notes that application data uses a server-side Postgres connection, so a policy file alone does not prove browser/RLS isolation. Run and record the two-user checks against the deployed schema before claiming this. |
| 7. Chart 1 title asks a question, axes labelled, zero baseline | **Approaching** | The dashboard has a “Recent Revenue” bar chart with month labels and a Rand scale, but its title is not a question and it has no explicit axis titles or decision note. Improve it or clearly state this limitation. |
| 8. Chart 2 is a different shape and answers a second question | **Not yet present** | No second, donut-style chart was found. Add one with a question title and labels/counts, or tell the panel plainly that this remains future work. |
| 9. Proposal exists in the repository | **Not found** | No `PROPOSAL.md` is present. Add the intended audience and the two questions the charts will answer; in the demo, explain what changed since the proposal. |
| 10. Smoke test, secret check, latest deploy | **Partly ready; verify live** | `git ls-files` lists `.env.example`, not `.env.local`. Tick the smoke checks in README, confirm the last commit is deployed and Vercel says Ready, and make sure no credentials or keys were committed. The README currently contains public demo credentials, so rotate them before any real-data deployment. |

### Two things to complete before the freeze

1. Add the deployed URL and a clear README structure: what it does, live link/demo login, run steps, stack and why, limitations, and three next steps.
2. Add `PROPOSAL.md`, strengthen the charts if time allows, and perform the smoke checks with two distinct accounts against the deployed environment. Do not describe RLS isolation as proven until those checks pass.

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
5. **Known limitations:** one basic chart, no second chart, and production two-user RLS verification still required until completed.
6. **Next:** add the second chart; prove two-user isolation; improve and validate deployment/README documentation.

The repository currently documents environment variable names and run steps. Before sharing a README, check that only `.env.example` is tracked and that its values are placeholders.

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
