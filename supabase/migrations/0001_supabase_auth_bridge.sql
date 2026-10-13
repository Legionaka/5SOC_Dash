-- Run this in the Supabase SQL editor before enabling Supabase Auth in the app.
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS auth_user_id UUID UNIQUE REFERENCES auth.users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS users_auth_user_id_idx
  ON public.users (auth_user_id);

-- Application server actions use the privileged Postgres connection. Do not
-- expose this table through a browser client until explicit RLS policies exist.
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
