# Medi-Clinic Capstone Stand-Up Script

**Format:** five-minute presentation and live demo, followed by questions in a
ten-minute slot. Replace bracketed text before presenting. Use demo accounts
and fictional data only.

## Before the panel arrives

- Open the deployed app in a private browser window. If there is no verified
  production URL, use the local demo only if its database is seeded; say that
  it is local rather than presenting it as a production deployment.
- Confirm the login page works, and have the admin demo login ready.
- Prepare one disposable customer and invoice. Know where the invoice edit and
  delete controls are.
- Open the admin dashboard and confirm both charts have data. If there is no
  data, use the empty-state honestly; do not invent numbers.
- Keep a backup recording ready. Do not use any real patient information.

## Spoken script and actions

### 0:00–0:30 | Welcome and introduction

**Say:**

“Good morning. My name is [your name], and this is my Medi-Clinic capstone
project. Medi-Clinic is a role-based clinic portal for patients and care
teams. It brings appointment workflows, patient follow-up, pharmacy tasks,
and billing into one application.”

**Do:** Face the panel, introduce yourself, then show the signed-out login
screen.

### 0:30–1:00 | Problem and purpose

**Say:**

“Clinic work can become difficult to coordinate when appointments, patient
requests, clinical follow-up, and billing live in separate places. My goal was
to give each user a focused workspace and keep access tied to their account
role. I’ll show the admin workflow and the two dashboard views.”

### 1:00–1:25 | Show sign-in protection

**Do:** While signed out, open `/dashboard` (or refresh it if already there)
and show that the app sends you to login. Return to login.

**Say:**

“Protected dashboard pages check the signed-in session on the server. The
application role is stored with the user profile, so choosing another URL
doesn’t grant a different role.”

### 1:25–2:45 | Demonstrate invoice CRUD and its customer link

**Do:** Sign in as the demo admin. Open Billing, create an invoice for the
disposable demo customer, and save it. Point out the selected customer. Edit
the amount or status, save, and show the updated row. Delete that disposable
invoice and confirm it disappears from the list.

**Say while working:**

“This invoice is linked to a customer through its customer ID. I’ll create a
disposable invoice, make a small edit, and remove it again to demonstrate the
list, create, update, and delete workflow.”

“I added a database migration that creates and validates the invoice-to-
customer foreign key. The migration still needs to be applied and verified in
the deployed database, so I’m describing that as implemented in the source,
not as a live database check that has already passed.”

### 2:45–3:35 | Show both dashboard charts

**Do:** Return to the admin dashboard. Point to the revenue bar chart, then the
appointment-status donut chart.

**Say:**

“The first chart asks, ‘How has monthly revenue changed over the last year?’
It uses a zero baseline and shows revenue in rand by month, which can help an
administrator spot a change worth investigating.”

“The second asks, ‘What is the appointment status mix today?’ It shows counts
and percentages by status, helping staff see where follow-up may be needed.
These views use the data currently available in the database, so their
operational value depends on keeping that data accurate and current.”

### 3:35–4:15 | Explain one technical decision

**Say:**

“A key design decision was to enforce role checks on the server, rather than
relying on hiding links in the browser. Supabase Auth establishes the session,
and the application profile supplies the role used by protected pages and
server actions. The app also has database RLS policies, but its application
queries use a separate server-side PostgreSQL connection. I still need to
record two-user isolation checks against the deployed Supabase setup before I
claim that isolation has been proven end to end.”

### 4:15–5:00 | Limits, next steps, and close

**Say:**

“The two charts and the invoice/customer relationship are now represented in
the source code. I still need to verify the production deployment, apply and
validate the foreign-key migration there, and run the two-user access checks.
The proposal also documents future work such as payment processing, signed
storage links, and real-time updates; those are not claims about features
already delivered.”

“That’s the Medi-Clinic walkthrough. Thank you. I’m ready for your questions.”

**Do:** Stop the live demo by five minutes and leave the rest of the slot for
questions and changeover.

## If the live demo fails

Say: “The live service isn’t responding, so I’ll use the prepared backup
recording to show the same workflow. I’ll keep the deployment issue on my
verification list rather than presenting the recording as a live check.”

Play the 60–90 second recording: signed-out login, admin sign-in, invoice
create/edit, both charts, and sign-out. Continue with the technical decision,
limitations, and close above.

## Likely questions

**How do you protect patient information?**

“Protected routes and server actions verify the signed-in user and role, and
patient queries are scoped to the patient's identity. RLS policies are also
included for Supabase API access. I have not completed the deployed two-user
test yet, and the server-side SQL connection is a separate access path, so I
won’t claim end-to-end isolation is proven until I test and record it.”

**Is the invoice/customer foreign key already active in the demo database?**

“The migration is in the repository and the seed schema declares the
relationship. The configured database could not be reached during my last
check, so I still need to apply the migration and verify it against the demo
database.”

**What would you do next?**

“First, verify the deployment and apply the database migration. Then run and
record the two-user access checks. After that, I would prioritize proposal
features based on clinic needs, starting with payment handling and secure
document storage.”

**What did the charts help you decide?**

“The revenue trend helps flag a month that may need billing or demand review.
The appointment-status distribution helps staff decide which queue items need
follow-up. The charts summarize records; they don’t make clinical decisions.”
