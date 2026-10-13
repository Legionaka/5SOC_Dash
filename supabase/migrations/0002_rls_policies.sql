-- Row Level Security for the Medi-Clinic application tables.
--
-- The application currently uses its server-side Postgres connection for data
-- access. These policies protect requests made through Supabase as the
-- `authenticated` role. The server-only connection remains responsible for
-- privileged workflows such as clinical writes, billing, and audit logging.

CREATE OR REPLACE FUNCTION public.current_app_email()
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT COALESCE(
    (
      SELECT lower(u.email)
      FROM public.users AS u
      WHERE u.auth_user_id = (SELECT auth.uid())
      LIMIT 1
    ),
    lower((SELECT auth.jwt() ->> 'email'))
  )
$$;

CREATE OR REPLACE FUNCTION public.current_app_role()
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT u.role
  FROM public.users AS u
  WHERE u.auth_user_id = (SELECT auth.uid())
     OR (u.auth_user_id IS NULL AND lower(u.email) = public.current_app_email())
  LIMIT 1
$$;

CREATE OR REPLACE FUNCTION public.current_app_is_any_role(allowed_roles TEXT[])
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT COALESCE(public.current_app_role() = ANY(allowed_roles), FALSE)
$$;

-- RLS is enabled on every application table. Tables without an allow policy
-- intentionally deny browser access by default.
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.patient_triage ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.consultation_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.doctors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.doctor_availability ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_channels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.refund_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.medical_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.patient_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clinical_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.diagnostic_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.patient_clinical_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.doctor_schedule_blocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.prescriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clinical_referrals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.patient_medication_reminders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wallet_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pharmacy_inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pharmacy_inventory_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.revenue ENABLE ROW LEVEL SECURITY;

-- Grants and policies are separate controls. Remove the default API grants
-- first, then grant only operations represented by the policies below.
REVOKE ALL ON TABLE
  public.users,
  public.appointments,
  public.patient_triage,
  public.consultation_types,
  public.doctors,
  public.doctor_availability,
  public.support_channels,
  public.refund_requests,
  public.notifications,
  public.medical_records,
  public.audit_logs,
  public.patient_requests,
  public.clinical_notes,
  public.diagnostic_results,
  public.patient_clinical_items,
  public.doctor_schedule_blocks,
  public.prescriptions,
  public.clinical_referrals,
  public.patient_medication_reminders,
  public.wallet_transactions,
  public.invoices,
  public.pharmacy_inventory,
  public.pharmacy_inventory_transactions,
  public.customers,
  public.revenue
FROM anon, authenticated;

GRANT USAGE ON SCHEMA public TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.appointments TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.patient_triage TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.consultation_types TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.doctors TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.doctor_availability TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.support_channels TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.refund_requests TO authenticated;
GRANT SELECT, UPDATE ON public.notifications TO authenticated;
GRANT SELECT ON public.medical_records TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.patient_requests TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.clinical_notes TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.diagnostic_results TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.patient_clinical_items TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.doctor_schedule_blocks TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.prescriptions TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.clinical_referrals TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.patient_medication_reminders TO authenticated;
GRANT SELECT ON public.wallet_transactions TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.invoices TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.pharmacy_inventory TO authenticated;
GRANT SELECT, INSERT ON public.pharmacy_inventory_transactions TO authenticated;
GRANT SELECT ON public.customers TO authenticated;
GRANT SELECT ON public.revenue TO authenticated;

-- Sensitive/server-only tables. No policy means deny for authenticated and
-- anonymous browser clients; the server database connection is unaffected.
CREATE POLICY users_server_only ON public.users
  FOR ALL TO authenticated USING (FALSE) WITH CHECK (FALSE);

CREATE POLICY audit_logs_server_only ON public.audit_logs
  FOR ALL TO authenticated USING (FALSE) WITH CHECK (FALSE);

-- Appointments: patients see and create their own; operational staff can work
-- with the clinic queue.
CREATE POLICY appointments_select ON public.appointments
  FOR SELECT TO authenticated
  USING (
    lower(patient_email) = public.current_app_email()
    OR public.current_app_is_any_role(ARRAY['admin', 'doctor', 'nurse', 'pharmacy_reception'])
  );

CREATE POLICY appointments_insert ON public.appointments
  FOR INSERT TO authenticated
  WITH CHECK (
    lower(patient_email) = public.current_app_email()
    AND public.current_app_role() = 'patient'
  );

CREATE POLICY appointments_update ON public.appointments
  FOR UPDATE TO authenticated
  USING (
    lower(patient_email) = public.current_app_email()
    OR public.current_app_is_any_role(ARRAY['admin', 'doctor', 'nurse', 'pharmacy_reception'])
  )
  WITH CHECK (
    lower(patient_email) = public.current_app_email()
    OR public.current_app_is_any_role(ARRAY['admin', 'doctor', 'nurse', 'pharmacy_reception'])
  );

-- Triage is readable by the patient and clinical staff, but writable only by
-- nursing staff or administrators.
CREATE POLICY patient_triage_select ON public.patient_triage
  FOR SELECT TO authenticated
  USING (
    lower(patient_email) = public.current_app_email()
    OR public.current_app_is_any_role(ARRAY['admin', 'doctor', 'nurse'])
  );

CREATE POLICY patient_triage_write ON public.patient_triage
  FOR INSERT TO authenticated
  WITH CHECK (public.current_app_is_any_role(ARRAY['admin', 'nurse']));

CREATE POLICY patient_triage_update ON public.patient_triage
  FOR UPDATE TO authenticated
  USING (public.current_app_is_any_role(ARRAY['admin', 'nurse']))
  WITH CHECK (public.current_app_is_any_role(ARRAY['admin', 'nurse']));

-- Public-to-authenticated booking catalog. Only admins may maintain it.
CREATE POLICY consultation_types_read ON public.consultation_types
  FOR SELECT TO authenticated USING (active = TRUE OR public.current_app_role() = 'admin');
CREATE POLICY consultation_types_admin_write ON public.consultation_types
  FOR ALL TO authenticated
  USING (public.current_app_role() = 'admin')
  WITH CHECK (public.current_app_role() = 'admin');

CREATE POLICY doctors_read ON public.doctors
  FOR SELECT TO authenticated USING (active = TRUE OR public.current_app_role() = 'admin');
CREATE POLICY doctors_admin_write ON public.doctors
  FOR ALL TO authenticated
  USING (public.current_app_role() = 'admin')
  WITH CHECK (public.current_app_role() = 'admin');

CREATE POLICY doctor_availability_read ON public.doctor_availability
  FOR SELECT TO authenticated USING (active = TRUE OR public.current_app_role() = 'admin');
CREATE POLICY doctor_availability_admin_write ON public.doctor_availability
  FOR ALL TO authenticated
  USING (public.current_app_role() = 'admin')
  WITH CHECK (public.current_app_role() = 'admin');

CREATE POLICY support_channels_read ON public.support_channels
  FOR SELECT TO authenticated USING (active = TRUE OR public.current_app_role() = 'admin');
CREATE POLICY support_channels_admin_write ON public.support_channels
  FOR ALL TO authenticated
  USING (public.current_app_role() = 'admin')
  WITH CHECK (public.current_app_role() = 'admin');

-- Patient-owned operational data.
CREATE POLICY refund_requests_patient_read ON public.refund_requests
  FOR SELECT TO authenticated
  USING (lower(patient_email) = public.current_app_email() OR public.current_app_role() = 'admin');
CREATE POLICY refund_requests_patient_insert ON public.refund_requests
  FOR INSERT TO authenticated
  WITH CHECK (lower(patient_email) = public.current_app_email() AND public.current_app_role() = 'patient');
CREATE POLICY refund_requests_admin_update ON public.refund_requests
  FOR UPDATE TO authenticated
  USING (public.current_app_role() = 'admin')
  WITH CHECK (public.current_app_role() = 'admin');

CREATE POLICY notifications_patient_read ON public.notifications
  FOR SELECT TO authenticated
  USING (lower(user_email) = public.current_app_email() OR public.current_app_role() = 'admin');
CREATE POLICY notifications_patient_update ON public.notifications
  FOR UPDATE TO authenticated
  USING (lower(user_email) = public.current_app_email())
  WITH CHECK (lower(user_email) = public.current_app_email());

CREATE POLICY medical_records_patient_read ON public.medical_records
  FOR SELECT TO authenticated
  USING (
    lower(patient_email) = public.current_app_email()
    OR public.current_app_is_any_role(ARRAY['admin', 'doctor', 'nurse'])
  );

CREATE POLICY patient_requests_read ON public.patient_requests
  FOR SELECT TO authenticated
  USING (
    lower(patient_email) = public.current_app_email()
    OR public.current_app_is_any_role(ARRAY['admin', 'doctor', 'nurse'])
  );
CREATE POLICY patient_requests_patient_insert ON public.patient_requests
  FOR INSERT TO authenticated
  WITH CHECK (lower(patient_email) = public.current_app_email() AND public.current_app_role() = 'patient');
CREATE POLICY patient_requests_staff_update ON public.patient_requests
  FOR UPDATE TO authenticated
  USING (public.current_app_is_any_role(ARRAY['admin', 'doctor', 'nurse']))
  WITH CHECK (public.current_app_is_any_role(ARRAY['admin', 'doctor', 'nurse']));

-- Clinical records. Patients only see records intended for them; staff access
-- is limited to the clinical roles that already exist in access-control.ts.
CREATE POLICY clinical_notes_read ON public.clinical_notes
  FOR SELECT TO authenticated
  USING (
    (lower(patient_email) = public.current_app_email() AND status = 'Signed')
    OR public.current_app_is_any_role(ARRAY['admin', 'doctor', 'nurse'])
  );
CREATE POLICY clinical_notes_doctor_write ON public.clinical_notes
  FOR INSERT TO authenticated
  WITH CHECK (public.current_app_is_any_role(ARRAY['admin', 'doctor']));
CREATE POLICY clinical_notes_doctor_update ON public.clinical_notes
  FOR UPDATE TO authenticated
  USING (public.current_app_is_any_role(ARRAY['admin', 'doctor']))
  WITH CHECK (public.current_app_is_any_role(ARRAY['admin', 'doctor']));

CREATE POLICY diagnostic_results_read ON public.diagnostic_results
  FOR SELECT TO authenticated
  USING (
    (lower(patient_email) = public.current_app_email() AND status = 'Released')
    OR public.current_app_is_any_role(ARRAY['admin', 'doctor', 'nurse'])
  );
CREATE POLICY diagnostic_results_clinician_write ON public.diagnostic_results
  FOR INSERT TO authenticated
  WITH CHECK (public.current_app_is_any_role(ARRAY['admin', 'doctor']));
CREATE POLICY diagnostic_results_clinician_update ON public.diagnostic_results
  FOR UPDATE TO authenticated
  USING (public.current_app_is_any_role(ARRAY['admin', 'doctor']))
  WITH CHECK (public.current_app_is_any_role(ARRAY['admin', 'doctor']));

CREATE POLICY patient_clinical_items_read ON public.patient_clinical_items
  FOR SELECT TO authenticated
  USING (
    (lower(patient_email) = public.current_app_email() AND archived_at IS NULL)
    OR public.current_app_is_any_role(ARRAY['admin', 'doctor', 'nurse'])
  );
CREATE POLICY patient_clinical_items_clinician_write ON public.patient_clinical_items
  FOR ALL TO authenticated
  USING (public.current_app_is_any_role(ARRAY['admin', 'doctor']))
  WITH CHECK (public.current_app_is_any_role(ARRAY['admin', 'doctor']));

CREATE POLICY doctor_schedule_blocks_read ON public.doctor_schedule_blocks
  FOR SELECT TO authenticated
  USING (
    lower(doctor_email) = public.current_app_email()
    OR public.current_app_role() = 'admin'
  );
CREATE POLICY doctor_schedule_blocks_admin_write ON public.doctor_schedule_blocks
  FOR ALL TO authenticated
  USING (public.current_app_role() = 'admin')
  WITH CHECK (public.current_app_role() = 'admin');

CREATE POLICY prescriptions_read ON public.prescriptions
  FOR SELECT TO authenticated
  USING (
    (lower(patient_email) = public.current_app_email() AND status <> 'Voided')
    OR public.current_app_is_any_role(ARRAY['admin', 'doctor', 'pharmacist'])
  );
CREATE POLICY prescriptions_doctor_write ON public.prescriptions
  FOR INSERT TO authenticated
  WITH CHECK (public.current_app_is_any_role(ARRAY['admin', 'doctor']));
CREATE POLICY prescriptions_clinical_update ON public.prescriptions
  FOR UPDATE TO authenticated
  USING (public.current_app_is_any_role(ARRAY['admin', 'doctor', 'pharmacist']))
  WITH CHECK (public.current_app_is_any_role(ARRAY['admin', 'doctor', 'pharmacist']));

CREATE POLICY clinical_referrals_read ON public.clinical_referrals
  FOR SELECT TO authenticated
  USING (
    (lower(patient_email) = public.current_app_email() AND status IN ('Sent', 'Completed'))
    OR public.current_app_is_any_role(ARRAY['admin', 'doctor'])
  );
CREATE POLICY clinical_referrals_doctor_write ON public.clinical_referrals
  FOR INSERT TO authenticated
  WITH CHECK (public.current_app_is_any_role(ARRAY['admin', 'doctor']));
CREATE POLICY clinical_referrals_doctor_update ON public.clinical_referrals
  FOR UPDATE TO authenticated
  USING (public.current_app_is_any_role(ARRAY['admin', 'doctor']))
  WITH CHECK (public.current_app_is_any_role(ARRAY['admin', 'doctor']));

CREATE POLICY medication_reminders_patient_access ON public.patient_medication_reminders
  FOR ALL TO authenticated
  USING (lower(patient_email) = public.current_app_email() AND public.current_app_role() = 'patient')
  WITH CHECK (lower(patient_email) = public.current_app_email() AND public.current_app_role() = 'patient');

CREATE POLICY wallet_transactions_patient_read ON public.wallet_transactions
  FOR SELECT TO authenticated
  USING (
    lower(patient_email) = public.current_app_email()
    OR public.current_app_is_any_role(ARRAY['admin', 'pharmacy_reception'])
  );

CREATE POLICY invoices_read ON public.invoices
  FOR SELECT TO authenticated
  USING (
    public.current_app_is_any_role(ARRAY['admin', 'pharmacy_reception'])
    OR EXISTS (
      SELECT 1 FROM public.customers AS c
      WHERE c.id = customer_id AND lower(c.email) = public.current_app_email()
    )
  );
CREATE POLICY invoices_admin_write ON public.invoices
  FOR INSERT TO authenticated
  WITH CHECK (public.current_app_role() = 'admin');
CREATE POLICY invoices_staff_update ON public.invoices
  FOR UPDATE TO authenticated
  USING (public.current_app_is_any_role(ARRAY['admin', 'pharmacy_reception']))
  WITH CHECK (public.current_app_is_any_role(ARRAY['admin', 'pharmacy_reception']));

CREATE POLICY pharmacy_inventory_staff_read ON public.pharmacy_inventory
  FOR SELECT TO authenticated
  USING (public.current_app_is_any_role(ARRAY['admin', 'pharmacy_stocker', 'pharmacist', 'pharmacy_reception']));
CREATE POLICY pharmacy_inventory_stock_write ON public.pharmacy_inventory
  FOR INSERT TO authenticated
  WITH CHECK (public.current_app_is_any_role(ARRAY['admin', 'pharmacy_stocker']));
CREATE POLICY pharmacy_inventory_stock_update ON public.pharmacy_inventory
  FOR UPDATE TO authenticated
  USING (public.current_app_is_any_role(ARRAY['admin', 'pharmacy_stocker']))
  WITH CHECK (public.current_app_is_any_role(ARRAY['admin', 'pharmacy_stocker']));

CREATE POLICY pharmacy_inventory_transactions_staff_read ON public.pharmacy_inventory_transactions
  FOR SELECT TO authenticated
  USING (public.current_app_is_any_role(ARRAY['admin', 'pharmacy_stocker', 'pharmacist', 'pharmacy_reception']));
CREATE POLICY pharmacy_inventory_transactions_stock_insert ON public.pharmacy_inventory_transactions
  FOR INSERT TO authenticated
  WITH CHECK (
    public.current_app_is_any_role(ARRAY['admin', 'pharmacy_stocker'])
    AND lower(actor_email) = public.current_app_email()
  );

CREATE POLICY customers_read ON public.customers
  FOR SELECT TO authenticated
  USING (
    lower(email) = public.current_app_email()
    OR public.current_app_is_any_role(ARRAY['admin', 'doctor', 'nurse', 'pharmacy_reception'])
  );

CREATE POLICY revenue_admin_read ON public.revenue
  FOR SELECT TO authenticated
  USING (public.current_app_role() = 'admin');

-- These functions are used by RLS predicates and must be callable by the
-- authenticated role, but the role must not be able to modify them.
REVOKE ALL ON FUNCTION public.current_app_email() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.current_app_role() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.current_app_is_any_role(TEXT[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.current_app_email() TO authenticated;
GRANT EXECUTE ON FUNCTION public.current_app_role() TO authenticated;
GRANT EXECUTE ON FUNCTION public.current_app_is_any_role(TEXT[]) TO authenticated;
