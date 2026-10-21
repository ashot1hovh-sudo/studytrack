-- Migration: in-app analytics (time per section and per lesson)
-- The student app lives at one URL, so page-view tools can't tell sections or
-- lessons apart. The app reports them itself: one row per view (a section, or a
-- lesson inside «Начало обучения»), whose `seconds` grows while the student is
-- active on it. `kind = 'paywall'` rows record a click on a locked lesson.
-- Written only by POST /api/analytics (service role), read only by
-- GET /api/admin/analytics (consultant check).
-- Run in the Supabase SQL editor (db.kaykitay.ru) or via psql in the db container.
-- Additive only: creates one table and two indexes.

CREATE TABLE IF NOT EXISTS public.analytics_views (
  id UUID PRIMARY KEY,
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  kind TEXT NOT NULL DEFAULT 'view' CHECK (kind IN ('view', 'paywall')),
  section TEXT NOT NULL,
  item TEXT,
  item_title TEXT,
  -- The student's access when the view started, so behaviour before paying
  -- stays visible after they pay.
  plan TEXT NOT NULL CHECK (plan IN ('free', 'paid')),
  seconds INTEGER NOT NULL DEFAULT 0 CHECK (seconds >= 0),
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS analytics_views_started_at_idx ON public.analytics_views (started_at);
CREATE INDEX IF NOT EXISTS analytics_views_student_idx ON public.analytics_views (student_id);

COMMENT ON TABLE public.analytics_views IS 'Time spent per app section / lesson. Service role only.';

-- RLS on with no policies: browser clients (anon/authenticated) get nothing.
ALTER TABLE public.analytics_views ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.analytics_views FROM anon, authenticated;
