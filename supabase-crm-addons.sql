-- CRM add-ons (Iana feedback, 2026-08) — three new columns on crm_clients.
--
-- Additive-only and idempotent: safe to run on the live self-hosted DB and safe
-- to re-run. Nothing existing is touched; no data migration.
--
--   majors          — free-text specialties the student is applying for
--   study_language  — 'chinese' | 'english' | 'unsure' (language of instruction)
--   stage_notes     — "who was promised what" at the current stage, surfaced as
--                     its own table column next to Этап (was a default block)
--
-- Also folded into supabase-crm.sql's create-table block for fresh installs.

alter table public.crm_clients add column if not exists majors text;
alter table public.crm_clients add column if not exists study_language text;
alter table public.crm_clients add column if not exists stage_notes text;
