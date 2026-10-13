-- DEMO ONLY: remove Auth users created by an earlier version of this script.
-- Do not insert directly into auth.users: Supabase manages that schema and
-- direct inserts can leave required Auth fields invalid, causing login errors.
-- After running this cleanup, run from the project root:
-- npm run auth:import-users -- --purge-existing --demo-passwords

BEGIN;

DELETE FROM auth.users;

COMMIT;
