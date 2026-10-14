-- DEMO ONLY: remove Auth users created by an earlier version of this script.
-- Do not insert directly into auth.users: Supabase manages that schema and
-- direct inserts can leave required Auth fields invalid, causing login errors.
-- After running this cleanup and seed, run from the project root:
-- npm run auth:import-users -- --demo-passwords

BEGIN;

DELETE FROM auth.users;

COMMIT;

-- Demo patient records shown in the admin dashboard patient directory.
-- These are database records only; add them to Supabase Auth separately if
-- these patients must also be able to sign in.
INSERT INTO public.users (
  name,
  email,
  password,
  role,
  must_change_password,
  date_of_birth,
  phone,
  national_id,
  patient_number,
  pharmacy_preference,
  emergency_contact,
  preferred_contact_method,
  data_sharing_consent,
  active
)
VALUES
(
  'Amina Khumalo',
  'amina.khumalo@example.com',
  '$2b$10$EkxxY0LPQ0on3Rq7vlABB.q.A544yMj8MjA14SUs1dU4VyxkBmTHK',
  'patient',
  FALSE,
  '1992-04-18',
  '+27 71 555 0101',
  '9204180123456',
  'PT-0001',
  'Clicks Pharmacy',
  '+27 82 555 0101',
  'email',
  TRUE,
  TRUE
),
(
  'Daniel Naidoo',
  'daniel.naidoo@example.com',
  '$2b$10$EkxxY0LPQ0on3Rq7vlABB.q.A544yMj8MjA14SUs1dU4VyxkBmTHK',
  'patient',
  FALSE,
  '1987-09-03',
  '+27 72 555 0102',
  '8709035123456',
  'PT-0002',
  'Dis-Chem',
  '+27 83 555 0102',
  'phone',
  TRUE,
  TRUE
)
ON CONFLICT (email) DO UPDATE SET
  name = EXCLUDED.name,
  role = EXCLUDED.role,
  date_of_birth = EXCLUDED.date_of_birth,
  phone = EXCLUDED.phone,
  national_id = EXCLUDED.national_id,
  patient_number = EXCLUDED.patient_number,
  pharmacy_preference = EXCLUDED.pharmacy_preference,
  emergency_contact = EXCLUDED.emergency_contact,
  preferred_contact_method = EXCLUDED.preferred_contact_method,
  data_sharing_consent = EXCLUDED.data_sharing_consent,
  active = EXCLUDED.active;

-- Keep the demo patient accounts available to the invoice workflow as well.
-- Invoices reference public.customers, so a users row alone cannot be selected
-- as an invoice customer without violating invoices_customer_id_fkey.
INSERT INTO public.customers (id, name, email, image_url)
VALUES
  ('a4d8d89f-7b7d-4b84-bc2e-7a2a4a000001', 'Amina Khumalo', 'amina.khumalo@example.com', '/customers/evil-rabbit.png'),
  ('a4d8d89f-7b7d-4b84-bc2e-7a2a4a000002', 'Daniel Naidoo', 'daniel.naidoo@example.com', '/customers/delba-de-oliveira.png')
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  email = EXCLUDED.email,
  image_url = EXCLUDED.image_url;
                                                                                                                                                                                                    
