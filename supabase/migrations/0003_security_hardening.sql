-- Security hardening: account lifecycle, permissions, and tamper-resistant audit logs.

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS active BOOLEAN NOT NULL DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS failed_login_attempts INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS locked_until TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS password_changed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS disabled_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS disabled_by TEXT,
  ADD COLUMN IF NOT EXISTS account_expires_at TIMESTAMPTZ;

CREATE UNIQUE INDEX IF NOT EXISTS users_email_lower_unique ON public.users (lower(email));
CREATE INDEX IF NOT EXISTS users_auth_user_id_idx ON public.users (auth_user_id);
CREATE INDEX IF NOT EXISTS users_active_role_idx ON public.users (active, role);

ALTER TABLE public.audit_logs
  ADD COLUMN IF NOT EXISTS ip_address INET,
  ADD COLUMN IF NOT EXISTS user_agent TEXT,
  ADD COLUMN IF NOT EXISTS request_id TEXT,
  ADD COLUMN IF NOT EXISTS reason TEXT;

CREATE INDEX IF NOT EXISTS audit_logs_created_at_idx ON public.audit_logs (created_at DESC);
CREATE INDEX IF NOT EXISTS audit_logs_actor_idx ON public.audit_logs (lower(actor_email), created_at DESC);
CREATE INDEX IF NOT EXISTS audit_logs_entity_idx ON public.audit_logs (entity_type, entity_id, created_at DESC);

CREATE TABLE IF NOT EXISTS public.permissions (
  key TEXT PRIMARY KEY,
  description TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS public.role_permissions (
  role TEXT NOT NULL,
  permission_key TEXT NOT NULL REFERENCES public.permissions(key) ON DELETE CASCADE,
  PRIMARY KEY (role, permission_key)
);

CREATE TABLE IF NOT EXISTS public.user_permissions (
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  permission_key TEXT NOT NULL REFERENCES public.permissions(key) ON DELETE CASCADE,
  granted BOOLEAN NOT NULL DEFAULT TRUE,
  PRIMARY KEY (user_id, permission_key)
);

INSERT INTO public.permissions (key, description) VALUES
  ('staff.manage', 'Create, disable, and reset staff accounts'),
  ('staff.sessions.revoke', 'Revoke staff authentication sessions'),
  ('schedule.manage', 'Manage doctor availability and schedule blocks'),
  ('patient.records.read', 'Read patient clinical records'),
  ('patient.records.write', 'Create or update patient clinical records'),
  ('pharmacy.manage', 'Manage pharmacy inventory and dispensing workflows'),
  ('billing.manage', 'Manage invoices and billing workflows'),
  ('audit.read', 'Read security and clinical audit events')
ON CONFLICT (key) DO UPDATE SET description = EXCLUDED.description;

INSERT INTO public.role_permissions (role, permission_key)
SELECT role, permission_key
FROM (VALUES
  ('admin', 'staff.manage'), ('admin', 'staff.sessions.revoke'), ('admin', 'schedule.manage'),
  ('admin', 'patient.records.read'), ('admin', 'patient.records.write'), ('admin', 'pharmacy.manage'),
  ('admin', 'billing.manage'), ('admin', 'audit.read'),
  ('doctor', 'schedule.manage'), ('doctor', 'patient.records.read'), ('doctor', 'patient.records.write'),
  ('nurse', 'patient.records.read'), ('nurse', 'patient.records.write'),
  ('pharmacist', 'pharmacy.manage'), ('pharmacy_stocker', 'pharmacy.manage'),
  ('pharmacy_reception', 'billing.manage')
) AS defaults(role, permission_key)
ON CONFLICT DO NOTHING;

CREATE OR REPLACE FUNCTION public.current_app_has_permission(required_permission TEXT)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.users u
    LEFT JOIN public.user_permissions up ON up.user_id = u.id
      AND up.permission_key = required_permission
    LEFT JOIN public.role_permissions rp ON rp.role = u.role
      AND rp.permission_key = required_permission
    WHERE u.auth_user_id = (SELECT auth.uid())
      AND u.active = TRUE
      AND (u.account_expires_at IS NULL OR u.account_expires_at > NOW())
      AND COALESCE(up.granted, TRUE) = TRUE
      AND (up.permission_key IS NOT NULL OR rp.permission_key IS NOT NULL)
  )
$$;

CREATE OR REPLACE FUNCTION public.prevent_audit_log_mutation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  RAISE EXCEPTION 'audit_logs are append-only';
END;
$$;

DROP TRIGGER IF EXISTS audit_logs_no_update ON public.audit_logs;
DROP TRIGGER IF EXISTS audit_logs_no_delete ON public.audit_logs;
CREATE TRIGGER audit_logs_no_update BEFORE UPDATE ON public.audit_logs
  FOR EACH ROW EXECUTE FUNCTION public.prevent_audit_log_mutation();
CREATE TRIGGER audit_logs_no_delete BEFORE DELETE ON public.audit_logs
  FOR EACH ROW EXECUTE FUNCTION public.prevent_audit_log_mutation();

ALTER TABLE public.permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_permissions ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.permissions, public.role_permissions, public.user_permissions FROM anon, authenticated;
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT SELECT ON public.permissions, public.role_permissions TO authenticated;
GRANT SELECT ON public.user_permissions TO authenticated;

DROP POLICY IF EXISTS permissions_read ON public.permissions;
CREATE POLICY permissions_read ON public.permissions FOR SELECT TO authenticated
  USING (public.current_app_has_permission('audit.read'));
DROP POLICY IF EXISTS role_permissions_read ON public.role_permissions;
CREATE POLICY role_permissions_read ON public.role_permissions FOR SELECT TO authenticated
  USING (public.current_app_has_permission('audit.read'));
DROP POLICY IF EXISTS user_permissions_read ON public.user_permissions;
CREATE POLICY user_permissions_read ON public.user_permissions FOR SELECT TO authenticated
  USING (public.current_app_has_permission('audit.read'));

REVOKE ALL ON FUNCTION public.current_app_has_permission(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.current_app_has_permission(TEXT) TO authenticated;
REVOKE ALL ON FUNCTION public.prevent_audit_log_mutation() FROM PUBLIC;

COMMENT ON TABLE public.audit_logs IS 'Append-only security and clinical activity trail. Writes are server-side only.';
