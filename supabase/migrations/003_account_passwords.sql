-- Migration: account passwords visible to the consultant
-- Supabase Auth keeps only a hash, so the admin could never see a password
-- after creating an account. This table keeps a copy, encrypted with
-- LK_SECRET_KEY (AES-256-GCM, src/lib/lk/secret.ts), written whenever the
-- admin creates an account or sets a new password.
-- Run in the Supabase SQL editor (db.kaykitay.ru) or via psql in the db container.
-- Additive only: creates one table.

CREATE TABLE IF NOT EXISTS public.account_passwords (
  student_id UUID PRIMARY KEY REFERENCES public.students(id) ON DELETE CASCADE,
  password_enc TEXT NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.account_passwords IS 'Encrypted copy of login passwords set by the admin. Service role only.';

-- RLS on with no policies: browser clients (anon/authenticated) get nothing.
-- Only /api/admin/students/:id/password (consultant check) reads or writes it.
ALTER TABLE public.account_passwords ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.account_passwords FROM anon, authenticated;
