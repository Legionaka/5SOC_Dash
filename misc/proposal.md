# Medi-Clinic Smart Platform Architecture & Technical Specification Proposal

This proposal outlines the implementation strategy, security frameworks, and system layout for the unified Medi-Clinic platform. It details the integrations for Supabase storage, Next.js dashboard routing, wallet architectures, appointment logic, scheduling matrix, role-based workflows, and legal audit guidelines.

---

## 1. Authentication, RBAC & Route Protection

### Dashboard Route Lockdown
To ensure ironclad multi-tenant isolation, Next.js routing enforces a strict condition. For the Next.js Patient/User dashboard login bypass during development or for explicit testing constraints:
- **Rule**: Only the exact login identifier `user@nextmail.com` is granted entry to the nextmail user test route. 
- **Mechanism**: Enforced via Next.js Middleware checking token metadata or email claims during session validation.

```typescript
// middleware.ts example enforcement snippet
if (req.nextUrl.pathname.startsWith('/dashboard/user')) {
  if (session?.user?.email !== 'user@nextmail.com') {
    return NextResponse.redirect(new URL('/auth/login', req.url));
  }
}
```

### System Roles Matrix
The application is governed by a strict Role-Based Access Control (RBAC) hierarchy across five discrete modules:
1. **Admin (Staff)**: Total operational visibility, user management, global schedules, and infrastructure oversight.
2. **Doctors**: Clinical oversight, diagnosis, schedule overrides, queue management, and Electronic Health Record (EHR) compilation.
3. **Patients (User)**: Account self-management, appointment bookings, personal wallet actions, and medical history view.
4. **Pharmacy (Split Roles)**:
   - *Front-Desk (Reception)*: Patient greeting, initial physical queue check-ins, collecting in-person payments, and basic logistics.
   - *Stocker*: Inventory ingestion, medical supplies management, expiration tracking, and replenishment alerts.
   - *Pharmacist*: Script validation, drug interaction checks, filling prescriptions, and releasing orders.

---

## 2. Supabase Storage Architecture & Objects Security

Patient medical records require zero-trust configuration. All records are organized dynamically inside a protected `storage.buckets` configuration.

### Folder Structure Isolation
Every patient profile automatically triggers a unique workspace within the storage bucket using their deterministic system UUID:
`patients-medical-records/pt_[patient_id]/`
Inside this path, sub-folders are categorized cleanly:
- `/identity/` (Avatar, identification papers, copies of medical insurance)
- `/clinical_history/` (Doctor notes addenda, specialized scans, lab transcripts)
- `/invoices/` (Automated transactional records and bill histories)

### Customizable Profile Information Schema
Patients can modify specific personal markers via an interface which updates their metadata profile:
- **Avatar image file**
- **First Name & Surname**
- **Date of Birth (DOB)**
- **National Identity Number (ID / Passport)**
- **System-Generated Unique Patient Number**
- **Email Address**

### Supabase Storage Commands, Objects & Security Policies (RLS)
Direct raw bucket execution or public URLs are strictly forbidden. To eliminate exposed data vectors, **Signed URLs** with short time-to-live windows (e.g., 15 minutes max) are systematically generated server-side.

#### Row Level Security (RLS) SQL Enforcement:
```sql
-- Enable Row Level Security on Storage Objects
alter table storage.objects enable row level security;

-- Policy: Patients can only view/read items inside their own unique sub-folder
create policy "Patients can access own subfolder"
on storage.objects for select
using (
  bucket_id = 'patients-medical-records' 
  and (storage.foldername(name))[1] = 'pt_' || auth.uid()::text
);

-- Policy: Staff & Clinical Doctors can read all folders for diagnostics
create policy "Staff clinical read access"
on storage.objects for select
using (
  bucket_id = 'patients-medical-records'
  and exists (
    select 1 from public.profiles
    where id = auth.uid() and role in ('admin', 'doctor', 'pharmacist')
  )
);
```

---

## 3. Real-Time Dynamic Appointment & Queue Engine

### Multi-Side Queue Architecture
The appointment engine links the Patient portal and Staff interface seamlessly. When a patient schedules a session, a reactive record populates the global database state.
- **Save & Update Constraint**: To eliminate unintentional race conditions or accidental over-bookings, changes are only compiled once either party hits an explicit **"Save and Update"** execution trigger.
- **UX Feedback Loop**: A custom circle turning/spinning loading animation is rendered directly to reflect state synchronization delays while saving parameters.

### Booking Limits & Recommendations
- **Daily Booking Caps**: Every practitioner profile possesses a hard-coded maximum limit of appointments per day (e.g., maximum 20 consultations) to prevent burnout and clinical error.
- **Collision Optimization**: When an appointment is delayed or a slot becomes unavailable, the staff dashboard allows interactive overrides. The patient dashboard automatically renders a dynamic **Recommendation Engine** suggested alternatives:
  - *Similar Practitioners*: Alternative doctors within the exact same medical tier or specialty.
  - *Optimized Time Slots*: Next closest available openings within a matching category.

### Appointment Category & Booking Matrix
Time blocks are tightly dictated by a predefined multi-tier hierarchical dropdown interface.

| Specialization Category | Doctor Type Examples | Predefined Consultations / Care Scenarios | Duration Allocation |
| :--- | :--- | :--- | :--- |
| **Primary & Specialized Care** | GPs, Family Physicians, Internists, Pediatricians, Geriatricians | **1. Routine & Preventive Care**<br>• Annual Physicals (BMI & Blood Pressure)<br>• Vaccinations (Flu shots, travel vaccines)<br>• Screenings (Cholesterol, diabetes panels)<br>• Lifestyle & Dietary Counseling | **30 Minutes** |
| | | **2. Acute Illnesses & Infections**<br>• Respiratory Issues (Colds, flu, bronchitis)<br>• Common Infections (UTIs, stomach bugs)<br>• Digestive Complaints (Reflux, severe pain) | **20 Minutes** |
| | | **3. Chronic Condition Management**<br>• Cardiovascular & Metabolic Tracking<br>• Pain & Joint Disorders (Arthritis, back pain)<br>• Respiratory Conditions (Asthma, COPD monitoring) | **40 Minutes** |
| | | **4. New or Concerning Symptoms**<br>• Skin Changes (New moles, persistent rashes)<br>• Unexplained Changes (Weight loss, fatigue)<br>• Acute Pain (Migraines, unexpected chest discomfort) | **45 Minutes** |
| | | **5. Mental Health & Administrative**<br>• Support (Anxiety, depression care plans)<br>• Specialist Referrals (Out-of-network logistics)<br>• Prescription Refills & Routine Maintenance Review | **15 Minutes** |
| **Medical Specialists** | Cardiologists, Dermatologists, Endocrinologists, Gastroenterologists, Neurologists, Oncologists, Ophthalmologists, ENT, Pulmonologists, Psychiatrists | Advanced system examinations, targeted diagnostics, disease stage profiling, and complex chronic care coordination. | **45 - 60 Minutes** |
| **Surgical Specialists** | General Surgeons, Orthopedic Surgeons, Neurosurgeons, Plastic Surgeons | Pre-operative screenings, surgery scheduling, traumatic physical deformity reviews, post-op wound tracking, and structural repairs. | **60+ Minutes** |

---

## 4. Financial Infrastructure & Online Wallet Engine

The financial hub provides flexible transaction support via integrated credit modules, clear tracking states, and automated receipt issuance.

### Wallet Ledger Architecture
Each patient account contains an immutable digital ledger wallet module.
- **The Refund Vector**: If an appointment is cancelled by the clinic, delayed excessively, or rescheduled outside of acceptable terms, a refund mechanism fires. The consultation fee is instantaneously reversed and allocated as store credit into the patient's **Online Wallet**.
- **Wallet Ingestion**: Patients can draw directly from this balance to settle future booking metrics or medicine dispensary items.

### Payment Flexibility & Tracking States
The platform supports dual financial tracking pipelines:
- **Online Payment**: Handled securely via payment gateway APIs.
- **In-Person Payment**: Checked off manually at the clinic by the Pharmacy Front-Desk/Reception staff.
- **Transaction States Matrix**:
  - `PAID`: Transaction finalized, cryptographic invoice generated.
  - `PENDING`: Slot provisionally held, awaiting verification or bank clearance.
  - `OUTGOING`: Processing active, or financial reimbursement payout in transit.

### Delayed Appointment Handling Policy
If operations back up or an emergency occurs causing doctor delays:
1. The patient can instantly trigger a full refund directly into their Online Wallet.
2. The patient can reschedule the booking to another calendar date free of charge. Any downstream pricing hikes or structural calendar adjustments for that specific rescheduled session are waived.

### Automated Documentation
Upon processing completion, a formal invoice summary is compiled by the system background worker and piped instantly to the verified **Patient Email Address** using automated SMTP templates.

---

## 5. Doctor Calendar, Shift Control & Clinical Guardrails

### Availability Control Panels
Staff and doctors utilize a granular calendar suite to block hours and control scheduling logic.
- **Doctor Shift Matrices**: Tracks individual operations from the exact moment of clocking in until the moment of clocking out.
- **Clinical Blocks**: Allows doctors or administrative staff to mark specific intervals as completely unavailable due to real-world variables:
  - Planned Surgical Procedures
  - On-call Emergencies
  - Inter-departmental Consultations or Personal Leave

### Clinical Dashboard Monitoring Metrics
Doctors are presented with a focused interface isolating clinical variables:
- **Clinical Queue Status**: Real-time display of incoming checked-in patients and the selected predefined reason for their visit.
- **Patient Chart Overviews**: Secure EHR visibility highlighting historic timelines, compound allergies, active drugs, and historical tests.
- **Lab & Diagnostics Manager**: Tracking module for pending or critical diagnostic results requiring prompt clinical review.

### Strict Legal Data Control and Records Retention
To maintain total compliance with medical regulatory statutes, data mutation is governed by the following rigid lifecycle constraints:

```text
+---------------------+-----------------------------------------------------------------------+
| Operational Metric  | Policy Enforcement Protocol                                           |
+---------------------+-----------------------------------------------------------------------+
| Retention Window    | Maintained permanently or for the statutory minimum (7 to 10 years    |
|                     | following final consultation; for minors, held until age 21).         |
+---------------------+-----------------------------------------------------------------------+
| Edit Capability     | Clinical notes/treatment parameters are open for modifications ONLY   |
|                     | until the active exam session is locked or signed off by the doctor.   |
|                     | Post-signature updates must be appended as an explicit Addendum.     |
+---------------------+-----------------------------------------------------------------------+
| Deletion Rules      | Hard deletions are completely blocked. No user, doctor, or system    |
|                     | administrator has authorization to remove record logs from the system. |
+---------------------+-----------------------------------------------------------------------+
| Archiving Mechanics | Past cases, inactive conditions, and resolved allergies are hidden    |
|                     | from immediate view but remain indexed for complete audit recovery.   |
+---------------------+-----------------------------------------------------------------------+
| Update Frequency    | Queues update dynamically in real-time as front-desk check-ins hit   |
|                     | the database, while chart updates append on a per-session lock basis. |
+---------------------+-----------------------------------------------------------------------+
```

---

## 6. Patient Enquiries & Support Nodes
To facilitate omni-channel operational guidance, patients can easily verify parameters or escalate concerns across three specific channels:
- **Telephonic Helpline**: Direct access line routed straight to clinic administrative desks.
- **On-Website Support**: Responsive live chat or interactive query dispatch system linked directly to receptionist queues.
- **In-Person Assistance**: Information hubs located directly at the hospital or clinic reception desks.