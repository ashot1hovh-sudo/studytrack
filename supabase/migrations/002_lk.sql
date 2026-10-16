-- Migration: v2 ЛК (сопровождение) storage
-- Replaces .data/lk.json and .data/lk-photos/ (lost on every Docker redeploy).
-- Run in the Supabase SQL editor (db.kaykitay.ru) or via psql in the db container.
-- Additive only: creates one table and one private bucket.

-- One row per student: the whole ЛК as jsonb (see src/lib/lk/types.ts LkData).
-- `version` is a compare-and-swap counter used by SupabaseLkStore.mutate.
CREATE TABLE IF NOT EXISTS public.lk (
  student_id UUID PRIMARY KEY REFERENCES public.students(id) ON DELETE CASCADE,
  data JSONB NOT NULL,
  version INTEGER NOT NULL DEFAULT 1,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.lk IS 'v2 ЛК per student. Holds encrypted portal passwords and internal notes: service role only.';

-- RLS on with no policies: browser clients (anon/authenticated) get nothing.
-- The app reads and writes through API routes with the service role, which
-- strips passwords and internal notes before anything reaches the family.
ALTER TABLE public.lk ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.lk FROM anon, authenticated;

-- Card photos: small WebP files named <student_id>.webp. Private bucket,
-- served only through GET /api/admin/lk/:id/photo (consultant login).
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('lk-photos', 'lk-photos', false, 614400, ARRAY['image/webp'])
ON CONFLICT (id) DO NOTHING;
