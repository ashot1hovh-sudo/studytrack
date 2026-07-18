# Project Handoff

## Goal

Build and launch **StudyTrack / «Кай Китай»** — a Russian-language web platform that lets students apply to Chinese universities **by themselves (DIY)**, without paying an agency.

**Product direction: pure DIY.** Free foundational modules for acquisition + paid modules/tools for revenue. The earlier "consultant-supervised / done-for-you" track has been set aside. There is still an admin (consultant) back-office, but the product being launched is the self-service one.

Launching into the **Russian market** — this drives the infrastructure migration below (152-FZ: Russian users' personal data must sit on servers in Russia).

---

## Stack

- **Next.js 14** App Router, TypeScript, Tailwind CSS
- **Supabase** — auth + Postgres DB + Storage (documents bucket)
- **Vercel** — original production deploy (still working)
- **Timeweb Cloud — Docker app, Moscow** — Russian-market deploy, **LIVE**: `https://ashot1hovh-sudo-studytrack-9bc8.twc1.net` (still talks to supabase.com — data migration pending, see below)
- **Driver.js** — first-login onboarding tour
- **Repo:** `https://github.com/ashot1hovh-sudo/studytrack.git`
- **Branch:** `diy-product` (active branch — both Vercel and Timeweb deploy from here)
- Repo root = the Next.js app itself (`package.json`, `next.config.mjs` at root — no subdirectory).

---

## Current State (as of commit `ea84c48`)

App is deployed and functional on **both Vercel and Timeweb (Moscow)**. Six main pages (sidebar / mobile nav): **Начало обучения, Главная, Чек-лист, Вузы, Дедлайны, Мои шансы** (+ consultant Admin dashboard).

Full functional breakdown lives in **`PRODUCT_OVERVIEW.md`** (repo root; a copy is also at `~/Downloads/StudyTrack_Product_Overview.md`) — written in the 2026-07-05/06 session for a VC stress-test. Read that for the complete page-by-page tour.

### Key subsystems
- **Learning (`src/sections/LearningStart.tsx`)** — 3 tutorial tracks (Языковой год / Предвуз / Бакалавриат), 12 shared lessons b1–b12 (Языковой год omits b7/b11). Lessons are markdown from `src/content/modules/`, rendered by `ProtectedLesson` with an anti-copy watermark + custom parser (headings, lists, tables, inline PDF/iframe). Free info cards + locked paid cards below.
- **Мои шансы (`src/sections/ChancesEvaluator.tsx`)** — transparent, filterable **table** of ~40 real admission cases (was an opaque matcher). Search + numeric filters (GPA/IELTS/CSCA Math).
- **Вузы (`src/sections/Universities.tsx`)** — personal application **tracker** (`UniTracker.tsx`, Supabase-backed via `/api/universities`) on top, program **explorer** (182 unis / 670 English programs, `China_Universities_Programs.json`) below.
- **Auth** — register / login / session / PIN unlock via Supabase Auth. **Email verification is still OFF (test mode)** — see Next Steps. The app is **fully server-side**: every `NEXT_PUBLIC_*` is read by server code at runtime, and the browser Supabase client (`src/lib/supabase/client.ts`) is dead code, imported nowhere. Practical upshot: runtime env vars are enough, build-time baking is irrelevant.
- **Onboarding tour (`src/components/OnboardingTour.tsx`)** — Driver.js. Runs once on first login (`localStorage` key `st_onboarded_v1`; append `?tour=1` to any URL to force a replay). 8 steps: two-founder greeting → one themed doodle per nav section → "both of them" finale. Targets the desktop sidebar or the mobile bottom nav depending on viewport, via `data-tour` / `data-tour="mnav-*"` attributes added to `Sidebar.tsx`.
- **Consultant widget (`src/components/ConsultantFab.tsx`)** — Iana doodle fixed at the right border at 50% opacity, always present. **2 minutes after the tour finishes** she peeks out for 20s (desktop hover peeks her too), a right-swipe snaps her back, tap → `t.me/ianadved`. Sequenced with the tour via a `window` `st:intro-done` event so she never interrupts the intro.
- **Doodle assets** — 10 transparent PNGs in `public/images/doodles/`. Source art lives in `ProdVersion_doodles/` (deliberately **not** committed, and excluded from the Docker image via `.dockerignore`).

---

## Session log — 2026-07-05/06

All pushed to `diy-product`; that session's commits end at `3284be8`.

1. **Мои шансы rebuilt for transparency** — removed the black-box matching algorithm; now a full scrollable **case table** with search + outcome + numeric-minimum filters (sticky university column). (`0da054b`, `e454184`; outcome summary pills later trimmed by user.)
2. **Removed** the "Платные модули" nav tab and the "10 Бюджетных ВУЗов" free card. (`3b386f7`)
3. **New lesson b12 "Анкета на портале вуза"** (`module-b13_new.md`) — 21-section university-application-form walkthrough. (`ad578ac`)
4. **Fixed lesson-number gaps** in filtered module views (use array index, not lesson id). (`d6e31be`)
5. **Restored the university application tracker** (`UniTracker.tsx`) above the program explorer; autocomplete now sources from the 182-uni DB with logos. (`ebe3d8a`)
6. **`PRODUCT_OVERVIEW.md`** written (2 copies) — full product/functional doc for a VC review, incl. an honest-weaknesses section.
7. **New "Как заполнить заявку в китайский университет" module** — locked card → full lesson page: RuTube **video** at top (`apply-guide`, `module-apply-guide.md` konspekt below), VPN-off notice, gated by subscription with a shared paywall modal. (`d86dfae`→`4913041`, `b732ade`)
8. **Intro "Начало" infographics cleaned** — converted all to **static**, deleted 3 broken ones (DurationMap, PrepTimeline, NextStepsProgress), added legends. (`309e317`)
9. **New "Введение в стипендии" lesson** (`module-scholarships.md`) + two static graphics (scholarship comparison table, coverage-tiers block) via a new `ProtectedLesson topExtra` prop. (`05288cc`, `3cefeec`)
10. **Email verification disabled for test mode** — register auto-confirms (`email_confirm: true`), no confirmation email, log in immediately. Marked `TEST MODE` for easy revert. (`3284be8`)
11. **Git auth fixed** — a GitHub PAT is now stored in the macOS keychain, so pushes work without re-pasting. (Transient `SSL_ERROR_SYSCALL` on push happens occasionally — just retry.)

---

## Session log — 2026-07-15/17

All pushed to `diy-product`. Latest commit: `ea84c48`.

**1. Timeweb deploy unblocked — the app is LIVE on Russian hosting.** The old root-404 was chased through four separate causes, in order:
   - The original app was a **Frontend (static)** app serving a `/out` export directory — Next.js SSR can't run that way, so `/` had no file → 404. Its framework dropdown offered only static frameworks; no SSR toggle exists for that app type. Unfixable in place.
   - Recreated as **Backend → Axum (Rust)** by accident (the Rust card is the default selection) → `npm: not found`, since the build container had no Node.
   - Recreated under the **Docker** tab but with the **Docker Compose** card selected → looked for a nonexistent `docker-compose.yml` → failed with *no logs at all*.
   - Finally **Docker → Dockerfile** card = correct. Containerized the app: `output: 'standalone'` + multi-stage `node:20-alpine` Dockerfile running `node server.js` on `0.0.0.0:$PORT`. (`2fab719`)
   - Also removed the `# syntax=docker/dockerfile:1` directive — it makes the builder fetch an external frontend image, which Timeweb blocks, failing the build before any step runs. (`d4b2f2c`)

**2. Build-time env landmine fixed.** `next build` imports every route module during "collecting page data", so a module-level `new Resend(process.env.RESEND_API_KEY)` in `src/lib/email.ts` threw *"Missing API key"* and killed the Timeweb build (its Docker build has **no** env vars — they're runtime-only). Fixed by constructing the client lazily inside `sendConfirmationEmail`. Verified `next build` exits 0 with `.env.local` removed. (`8971ae1`)

**3. Login "failure" diagnosed — it was a UI bug, not auth.** A full register→login probe against the live app returned `200` + a valid `sb-…-auth-token` cookie, so auth/env/cookies were fine. The real problem: the register tab rendered `loginError` from context, which a previously failed login leaves set (context exposes no clear method) — so registration showed *"Неверный email или пароль"*, and genuine registration errors were invisible (only a shake). Added a dedicated `registerError`; the register tab no longer shows the login error. (`cb9a8e5`)

**4. First-login onboarding tour + doodle characters.** Driver.js tour, 8 branded steps with a themed Ashot/Iana doodle each (see Current State). Plus the floating consultant widget (Iana → Telegram). (`ea84c48`)

---

## Infrastructure migration (Vercel+Supabase → Russian)

**Why:** 152-FZ requires Russian citizens' personal data on Russian servers. DB + Storage + Auth must move before onboarding real students.

**Status:** ✅ **Hosting done** — the app runs on Timeweb (Docker app, Moscow region). ❌ **Data not migrated** — it still reads/writes supabase.com. That's fine while there are no real users (test data → 152-FZ doesn't bite yet), but it is the blocker before onboarding real students.

### ✅ Decision locked: **Path A — self-host Supabase on a Timeweb VM**

Run the open-source Supabase stack (Postgres + Auth + Storage) via `docker compose` on a Timeweb **Cloud Server**, then repoint the app's env vars at it. Code stays ~identical — same `supabase-js`, same auth, same storage API. "Move the data = move auth", one migration.

**Path B was evaluated and rejected for now** (Timeweb Managed Postgres + S3 + NextAuth). It's the cleaner long-term destination, but it's far bigger than it looks in this codebase:
- Managed Postgres has **no PostgREST**, so every `supabase.from(...)` call across ~30 API routes must be rewritten to Drizzle/SQL — the whole data layer, not just auth.
- Dropping Supabase Auth kills `auth.uid()`, so **every RLS policy** must be re-implemented as explicit ownership checks in app code — the highest-risk part (this is where data leaks happen).
- Realistic estimate 7–11 days. **Plan: launch on A, migrate to B later**, calmly, with real load data to justify it.

**Path A steps (not started):**
1. Provision a Timeweb Cloud Server (suggested 2 vCPU / 4 GB / 40–80 GB SSD, Ubuntu 22.04, Russian region).
2. `docker compose up` the self-hosted Supabase stack; lock down firewall/SSH.
3. Restore schema (`supabase-schema.sql`, `supabase-admin.sql`, `supabase-storage.sql`), migrate data + the documents bucket.
4. Repoint the Timeweb app's env vars at the self-hosted instance and redeploy.
5. Set up backups + update policy (this is the VM "babysitting" cost of Path A).

---

## Timeweb deploy recipe (hard-won — follow exactly)

Creating the app: **Приложения → Создать → Тип: `Docker` → the `Dockerfile` card** (NOT `Docker Compose`, NOT `Frontend`, NOT a `Backend` framework preset — each of those failed, see session log).

| Setting | Value |
|---|---|
| Repo / branch | `ashot1hovh-sudo/studytrack` / **`diy-product`** |
| Type | Docker → **Dockerfile** |
| Region | Москва (Russia) |
| Config | 2 GB RAM (1 GB risks OOM during `next build`) |
| Port | **3000** |
| Env vars | the 5 below |

The repo-root `Dockerfile` handles everything (install → build → `node server.js`). Autodeploy on the last commit is enabled, so a push to `diy-product` redeploys automatically.

---

## Environment Variables Required

Set on **both** Vercel and Timeweb (Timeweb → App → Переменные). Copy values from local `.env.local`. These are read at **runtime** by server code, so no build-time baking is needed:

```
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY   # app also reads ANON_KEY; PUBLISHABLE is what's set
SUPABASE_SERVICE_ROLE_KEY
RESEND_API_KEY                          # verification emails (unused while test mode is on)
NEXT_PUBLIC_APP_URL                     # set to the deploy's own domain (Timeweb: the *.twc1.net URL)
CASES_SHEET_ID                          # optional — Мои шансы falls back to built-in data
```

Without the Supabase vars the API routes return setup errors and nothing loads.

---

## Next Steps (priority order)

1. **Path A migration** — stand up self-hosted Supabase on a Timeweb VM and repoint the app (5 steps above). This is the gate before any real student data.
2. **Payment / self-serve subscription — YooKassa (ЮKassa)** *(decided; not built)*. Today there is **no self-serve upgrade path**: the consultant sets `pin_code` manually via `/api/admin/students/update-subscription`, and the student enters it. Target flow: create-payment route → YooKassa `confirmation_url` → webhook on `payment.succeeded` → generate a PIN → email it → the existing `/api/auth/verify-pin` already flips `subscription_status` to `active`. Requires a legal entity (самозанятый/ИП/ООО).
3. **Re-enable email verification before production** — flip `email_confirm` back to `false` in `src/app/api/auth/register/route.ts` and restore the confirmation-email block (both marked `TEST MODE`). ⚠️ **Blocked on a verified sender domain:** `src/lib/email.ts` sends from `onboarding@resend.dev`, Resend's shared test sender, which **only delivers to the account owner's own inbox**. Verify a real domain in Resend and send from `noreply@<domain>` — this blocks both verification emails *and* the PIN emails in step 2.
4. **Set `NEXT_PUBLIC_APP_URL`** on the Timeweb app to `https://ashot1hovh-sudo-studytrack-9bc8.twc1.net`, and add that domain to **Supabase → Auth → URL Configuration → Redirect URLs** (needed once email verification is back on).
5. **Grow the Мои шансы dataset** — real admission outcomes are a recurring moat; keep it fresh.
6. **Mobile QA pass** on a real phone before launch (lesson reader, video modal/iframe, tracker + table tap targets, and the new tour + consultant widget).

### Housekeeping
- Delete the throwaway probe account created while debugging login: `probe-timeweb-1784177917@example.com` (Supabase → Authentication → Users).
- `src/data/China_Universities_Programs.json` has an **uncommitted local modification** predating this session — decide whether to keep or discard it.
- `src/lib/supabase/client.ts` (browser Supabase client) is **dead code** — safe to delete.

---

## Notes / gotchas
- Garbled-Cyrillic pasted `.md` files: the clean originals are in `~/Downloads/` — copy from disk rather than the paste.
- Pushes can hit a transient `SSL_ERROR_SYSCALL`; retry 2–3×.
- Leftover old lesson files (`module-b7.md`, `module-b11.md`, etc.) coexist with the `_new` versions; the route map in `/api/learning/module/[lessonId]/route.ts` is the source of truth for which file each lesson uses.
- **Never construct an SDK client at module scope from an env var.** `next build` imports every route during "collecting page data", and the Timeweb Docker build has no env vars — a module-level client throws and kills the build. Construct lazily inside the function. (This is what the Resend bug was.)
- **Timeweb build failing with *no logs at all*** = it died before the first step. Usual causes: wrong Docker sub-type (Compose vs Dockerfile) or a `# syntax=` directive it can't fetch.
- **Verify env-less builds locally before pushing:** `mv .env.local .env.local.bak && npm run build; mv .env.local.bak .env.local` — this reproduces Timeweb's build conditions exactly.
- **React StrictMode** (on by default in dev) mounts → cleans up → remounts, so an effect that schedules a timer and clears it on cleanup will be cancelled if a "already ran" guard blocks the second run. Put the guard *inside* the timer callback (see `OnboardingTour.tsx`).
- The doodle PNGs are ~400–650 KB each at 1024². Fine for now, but **resize/compress them** if the tour ever feels slow on mobile data.
- The consultant's reveal delay is `REVEAL_DELAY_MS` in `ConsultantFab.tsx` (currently `120000` = 2 min; was `5000` while testing).
