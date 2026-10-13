-- DEMO ONLY: this permanently deletes every Supabase Auth user and every
-- application user profile before recreating the dashboard demo accounts.
-- Run only in a disposable/demo Supabase project after the application tables
-- and 0001_supabase_auth_bridge.sql have been applied.

BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- public.users.auth_user_id uses ON DELETE SET NULL, so remove the Auth users
-- first and then remove the application profiles and related permissions.
DELETE FROM auth.users;
DELETE FROM public.users;

-- Supabase Auth accounts. The SQL editor runs with sufficient privileges to
-- write auth.users. email_confirmed_at keeps this local demo usable without
-- configuring an SMTP provider. The VALUES dataset is inline so this script
-- does not depend on a pre-existing demo_accounts table.
INSERT INTO auth.users (
  instance_id,
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at
)
SELECT
  '00000000-0000-0000-0000-000000000000',
  id,
  'authenticated',
  'authenticated',
  email,
  crypt(password, gen_salt('bf', 12)),
  NOW(),
  jsonb_build_object('provider', 'email', 'providers', jsonb_build_array('email')),
  jsonb_build_object('name', name),
  NOW(),
  NOW()
FROM (VALUES
  ('6b5d4c44-6c2c-4cc5-9d59-6cbb7b8a0001'::uuid, 'Demo Admin', 'admin@medi-clinic.com', 'MediAdmin!2026', 'admin'),
  ('6b5d4c44-6c2c-4cc5-9d59-6cbb7b8a0002'::uuid, 'Demo Doctor', 'doctor@medi-clinic.com', 'MediDoctor!2026', 'doctor'),
  ('6b5d4c44-6c2c-4cc5-9d59-6cbb7b8a0003'::uuid, 'Demo Nurse', 'nurse@medi-clinic.com', 'MediNurse!2026', 'nurse'),
  ('410544b2-4001-4271-9855-fec4b6a6442a'::uuid, 'Demo Patient', 'user@nextmail.com', 'MediPatient!2026', 'patient'),
  ('6b5d4c44-6c2c-4cc5-9d59-6cbb7b8a0004'::uuid, 'Pharmacy Reception', 'reception@medi-clinic.com', 'MediReception!2026', 'pharmacy_reception'),
  ('6b5d4c44-6c2c-4cc5-9d59-6cbb7b8a0005'::uuid, 'Pharmacy Stocker', 'stocker@medi-clinic.com', 'MediStocker!2026', 'pharmacy_stocker'),
  ('6b5d4c44-6c2c-4cc5-9d59-6cbb7b8a0006'::uuid, 'Demo Pharmacist', 'pharmacist@medi-clinic.com', 'MediPharmacist!2026', 'pharmacist')
) AS demo_accounts(id, name, email, password, role);

-- Application profiles used by the server-side role and dashboard guards.
INSERT INTO public.users (
  id,
  name,
  email,
  password,
  role,
  must_change_password,
  auth_user_id,
  active
)
SELECT
  id,
  name,
  email,
  crypt(password, gen_salt('bf', 12)),
  role,
  FALSE,
  id,
  TRUE
FROM (VALUES
  ('6b5d4c44-6c2c-4cc5-9d59-6cbb7b8a0001'::uuid, 'Demo Admin', 'admin@medi-clinic.com', 'MediAdmin!2026', 'admin'),
  ('6b5d4c44-6c2c-4cc5-9d59-6cbb7b8a0002'::uuid, 'Demo Doctor', 'doctor@medi-clinic.com', 'MediDoctor!2026', 'doctor'),
  ('6b5d4c44-6c2c-4cc5-9d59-6cbb7b8a0003'::uuid, 'Demo Nurse', 'nurse@medi-clinic.com', 'MediNurse!2026', 'nurse'),
  ('410544b2-4001-4271-9855-fec4b6a6442a'::uuid, 'Demo Patient', 'user@nextmail.com', 'MediPatient!2026', 'patient'),
  ('6b5d4c44-6c2c-4cc5-9d59-6cbb7b8a0004'::uuid, 'Pharmacy Reception', 'reception@medi-clinic.com', 'MediReception!2026', 'pharmacy_reception'),
  ('6b5d4c44-6c2c-4cc5-9d59-6cbb7b8a0005'::uuid, 'Pharmacy Stocker', 'stocker@medi-clinic.com', 'MediStocker!2026', 'pharmacy_stocker'),
  ('6b5d4c44-6c2c-4cc5-9d59-6cbb7b8a0006'::uuid, 'Demo Pharmacist', 'pharmacist@medi-clinic.com', 'MediPharmacist!2026', 'pharmacist')
) AS demo_accounts(id, name, email, password, role);

COMMIT;
