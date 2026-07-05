# Project Handoff

## Goal

Build and launch **StudyTrack / «Кай Китай»** — a Russian-language web platform that lets students apply to Chinese universities **by themselves (DIY)**, without paying an agency.

**Product direction: pure DIY.** Free foundational modules for acquisition + paid modules/tools for revenue. The earlier "consultant-supervised / done-for-you" track has been set aside. There is still an admin (consultant) back-office, but the product being launched is the self-service one.

Launching into the **Russian market** — this drives the infrastructure migration below (152-FZ: Russian users' personal data must sit on servers in Russia).

---

## Stack

- **Next.js 14** App Router, TypeScript, Tailwind CSS
- **Supabase** — auth + Postgres DB + Storage (documents bucket)
- **Vercel** — current production deploy (working)
- **Timeweb Cloud App Platform** — Russian-market test/prod target (in progress, see below)
- **Repo:** `https://github.com/ashot1hovh-sudo/studytrack.git`
- **Branch:** `diy-product` (active branch — both Vercel and Timeweb deploy from here)
- Repo root = the Next.js app itself (`package.json`, `next.config.mjs` at root — no subdirectory).

---

## Current State (as of commit `3284be8`)

App is deployed and functional on Vercel. Six main pages (sidebar / mobile nav): **Начало обучения, Главная, Чек-лист, Вузы, Дедлайны, Мои шансы** (+ consultant Admin dashboard).

Full functional breakdown lives in **`PRODUCT_OVERVIEW.md`** (repo root; a copy is also at `~/Downloads/StudyTrack_Product_Overview.md`) — written this session for a VC stress-test. Read that for the complete page-by-page tour.

### Key subsystems
- **Learning (`src/sections/LearningStart.tsx`)** — 3 tutorial tracks (Языковой год / Предвуз / Бакалавриат), 12 shared lessons b1–b12 (Языковой год omits b7/b11). Lessons are markdown from `src/content/modules/`, rendered by `ProtectedLesson` with an anti-copy watermark + custom parser (headings, lists, tables, inline PDF/iframe). Free info cards + locked paid cards below.
- **Мои шансы (`src/sections/ChancesEvaluator.tsx`)** — transparent, filterable **table** of ~40 real admission cases (was an opaque matcher). Search + numeric filters (GPA/IELTS/CSCA Math).
- **Вузы (`src/sections/Universities.tsx`)** — personal application **tracker** (`UniTracker.tsx`, Supabase-backed via `/api/universities`) on top, program **explorer** (182 unis / 670 English programs, `China_Universities_Programs.json`) below.
- **Auth** — register / login / session / PIN unlock via Supabase Auth. **Email verification is currently OFF (test mode)** — see today's log.

---

## Session log — 2026-07-05/06

All pushed to `diy-product`. Latest commit: `3284be8`.

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

## Infrastructure migration (Vercel+Supabase → Russian, in progress)

**Why:** 152-FZ requires Russian citizens' personal data on Russian servers. DB + Storage + Auth must move before onboarding real students. Hosting recommended to co-locate.

**Chosen direction:** **Timeweb Cloud** (indie-friendly; leaning here over Yandex). App already deployed on **Timeweb App Platform** as "Intelligent Quail" from the `diy-product` repo → a `*.twc1.net` free domain.

**Migration order (planned, not executed):** introduce Drizzle ORM on existing Supabase → flip DB to Russian Managed Postgres → swap Storage to S3-compatible → rewrite Auth (biggest chunk; ~60% of effort) → move hosting last. During dev you can keep the Vercel-style loop by pointing a test deploy at test infra (fake data → 152-FZ doesn't bite until real users).

**Two paths still open:**
- **Path A (fastest):** self-host the open-source Supabase stack on a Timeweb VM → code stays ~identical, "move the data = move auth". Trade-off: you run the VM.
- **Path B (cleaner long-term):** Timeweb Managed Postgres + S3 + self-hosted NextAuth. More code work (auth rewrite), fully managed pieces.

### ⚠️ Open blocker: Timeweb App Platform serves root **404** while showing "online"
`next.config.mjs` has **no** static export (correct — this app is SSR with API routes + middleware). Root-404-while-online almost always = App Platform misconfig. To resolve, check on Timeweb:
- **Настройки:** app type must be **Next.js SSR / Node server** (NOT "Frontend/Static"); build = `npm run build`; run = `npm run start` (`next start`); port 3000 (or `next start -p $PORT`).
- **Деплой log:** confirm `next build` actually succeeded.
- **Env vars** must be set (see below) and the app **rebuilt** afterward (`NEXT_PUBLIC_*` bake in at build time, not restart).
- Add the Timeweb domain to **Supabase → Auth → Redirect URLs** (for when email verification is back on).

---

## Environment Variables Required

Set on **both** Vercel and Timeweb App Platform (Timeweb → App → Переменные). Copy values from local `.env.local`:

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

1. **Unblock the Timeweb 404** — verify App Platform runs as Node/SSR with `next start`, env vars set, then rebuild. This is the gate for the whole Russian-market test.
2. **Decide migration Path A vs B** (self-host Supabase vs Timeweb-native + NextAuth) and start step 1 of whichever.
3. **Re-enable email verification before production** — flip `email_confirm` back to `false` in `src/app/api/auth/register/route.ts` and restore the confirmation-email block (both marked `TEST MODE`).
4. **Payment / subscription flow** — subscription status shows correctly, but there's no self-serve upgrade path (currently manual PIN unlock + Supabase update).
5. **Grow the Мои шансы dataset** — real admission outcomes are a recurring moat; keep it fresh.
6. **Mobile QA pass** on a real phone before launch (lesson reader, video modal/iframe, tracker + table tap targets).

---

## Notes / gotchas
- Garbled-Cyrillic pasted `.md` files: the clean originals are in `~/Downloads/` — copy from disk rather than the paste.
- Pushes can hit a transient `SSL_ERROR_SYSCALL`; retry 2–3×.
- Leftover old lesson files (`module-b7.md`, `module-b11.md`, etc.) coexist with the `_new` versions; the route map in `/api/learning/module/[lessonId]/route.ts` is the source of truth for which file each lesson uses.
