-- CRM payments column (Iana feedback, 2026-08) — one new column on crm_clients.
--
-- Additive-only and idempotent: safe to run on the live self-hosted DB and safe
-- to re-run. Nothing existing is touched; no data migration.
--
--   payments — free-text notes about the client's payments, surfaced as its own
--              table column right after Заметки по этапу (stage_notes).
--
-- Also folded into supabase-crm.sql's create-table block for fresh installs.

alter table public.crm_clients add column if not exists payments text;
