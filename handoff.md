# Project Handoff

## Goal

Build and launch **StudyTrack / «Кай Китай»** — a Russian-language web platform that lets students apply to Chinese universities **by themselves (DIY)**, without paying an agency.

**Product direction: pure DIY.** Free foundational modules for acquisition + paid modules/tools for revenue. The earlier "consultant-supervised / done-for-you" track has been set aside. There is still an admin (consultant) back-office, but the product being launched is the self-service one.

Launching into the **Russian market** — this drives the infrastructure migration below (152-FZ: Russian users' personal data must sit on servers in Russia).

---

## Stack

- **Next.js 14** App Router, TypeScript, Tailwind CSS
- **Supabase, self-hosted** — auth + Postgres 17 + Storage, running on a Timeweb VM at **`https://db.kaykitay.ru`** (`104.171.138.217`, Moscow). Same `supabase-js` API as hosted Supabase.
- **Vercel** — original production deploy. ⚠️ Still points at **supabase.com**, so it and Timeweb now read different databases. Decommission or repoint it.
- **Timeweb Cloud — Docker app, Moscow** — Russian-market deploy, **LIVE at its own domain `https://app.kaykitay.ru`** (custom domain bound in the Timeweb app panel, valid Let's Encrypt TLS). The internal host `ashot1hovh-sudo-studytrack-9bc8.twc1.net` (the `-9bc8` app) still serves the same deploy. Talks to the self-hosted Supabase above. ⚠️ A **dead `-51d7` app** also exists in the account (leftover, serves 404) — delete it.
- **Timeweb mail** — `noreply@kaykitay.ru` via `smtp.timeweb.ru:587`, SPF/DKIM/DMARC configured. Sends all auth email. ⚠️ **mail.ru addresses don't receive it** (Gmail/Yandex fine) — see the launch session log.
- **Domain** — `kaykitay.ru` (registered at Timeweb 2026-07-18). `app.` → the Timeweb app; `db.` → the Supabase VM. Bind subdomains via the app panel's «Внешний домен», not by hand-pointing DNS at the VM IP.
- **Driver.js** — first-login onboarding tour
- **Repo:** `https://github.com/ashot1hovh-sudo/studytrack.git`
- **Branch:** `diy-product` (active branch — both Vercel and Timeweb deploy from here)
- Repo root = the Next.js app itself (`package.json`, `next.config.mjs` at root — no subdirectory).

---

## Current State (as of commit `097a003`)

**The platform is LIVE at `https://app.kaykitay.ru`.** Six main pages (sidebar / mobile nav): **Начало обучения, Главная, Чек-лист, Вузы, Дедлайны, Кейсы поступлений** (renamed from «Мои шансы») + consultant Admin dashboard. Light/dark theme toggle. Parent mode was removed entirely.

Full functional breakdown lives in **`PRODUCT_OVERVIEW.md`** (repo root; a copy is also at `~/Downloads/StudyTrack_Product_Overview.md`) — written in the 2026-07-05/06 session for a VC stress-test. Read that for the complete page-by-page tour.

### Key subsystems
- **Learning (`src/sections/LearningStart.tsx`)** — 3 tutorial tracks (Языковой год / Предвуз / Бакалавриат), 12 shared lessons b1–b12 (Языковой год omits b7/b11). Lessons are markdown from `src/content/modules/`, rendered by `ProtectedLesson` with an anti-copy watermark + custom parser (headings, lists, tables, inline PDF/iframe). Free info cards + locked paid cards below.
- **Мои шансы (`src/sections/ChancesEvaluator.tsx`)** — transparent, filterable **table** of ~40 real admission cases (was an opaque matcher). Search + numeric filters (GPA/IELTS/CSCA Math).
- **Вузы (`src/sections/Universities.tsx`)** — personal application **tracker** (`UniTracker.tsx`, Supabase-backed via `/api/universities`) on top, program **explorer** (182 unis / 670 English programs, `China_Universities_Programs.json`) below.
- **Auth** — register / login / session / PIN unlock via Supabase Auth. Email verification is ON (6-digit code + magic link). **2 concurrent sessions per account** (`public.enforce_session_limit`), consultants exempt. The app is **fully server-side**: every `NEXT_PUBLIC_*` is read by server code at runtime, and the browser Supabase client (`src/lib/supabase/client.ts`) is dead code, imported nowhere. Practical upshot: runtime env vars are enough, build-time baking is irrelevant.
- **Onboarding tour (`src/components/OnboardingTour.tsx`)** — Driver.js. Runs once **per account** — `students.onboarding_completed_at`, surfaced as `user.onboardingCompleted`; `localStorage` (`st_onboarded_v2:<uuid>`) is only a per-user cache to prevent a flash before the session loads. Append `?tour=1` to any URL to force a replay (the param now survives tab clicks). 8 steps: two-founder greeting → one themed doodle per nav section → "both of them" finale. Targets the desktop sidebar or the mobile bottom nav depending on viewport, via `data-tour` / `data-tour="mnav-*"` attributes added to `Sidebar.tsx`.
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

## Session log — 2026-07-18

**Path A migration COMPLETE.** The app now runs entirely on Russian infrastructure: Timeweb app → self-hosted Supabase on a Timeweb VM → Timeweb mail. supabase.com is no longer in the request path.

**1. Domain registered: `kaykitay.ru`** (Timeweb, NS at Timeweb, paid to 2026-07-18+1y). ⚠️ **Автопродление was OFF at purchase** — verify it's on; the whole platform dies on expiry. Subdomain `db.kaykitay.ru` → the Supabase VM.

**2. Cloud server provisioned** — `104.171.138.217`, Ubuntu 24.04 LTS, 2 vCPU / 4 GB / 50 GB NVMe, Moscow (MSK-1), backups enabled, ~1 480 ₽/мес. Chose 24.04 over 22.04 deliberately: 22.04's standard support ends April 2027, which would force an OS upgrade within a year of launch.

**3. Server hardened** — ufw (only 22/80/443 in; Postgres never public), fail2ban, 4 GB swap, full `apt upgrade`, SSH key-only (password auth disabled at order time).

**4. Self-hosted Supabase stack up** — `/opt/supabase/docker/supabase-project`, 12 containers, all healthy. Postgres 17.6, GoTrue 2.189, PostgREST 14.12, Kong, Studio, Realtime, Storage, Supavisor, Caddy. Managed with `sh run.sh {start|stop|status|logs}`.

**5. TLS** — Caddy override (`docker-compose.caddy.yml`) auto-issued a Let's Encrypt cert for `db.kaykitay.ru`, auto-renewing.

**6. Schema restored + drift fixed.** The three `.sql` files applied cleanly, but registration then failed on `pin_code`. Diffing the old supabase.com schema (via its PostgREST OpenAPI spec) against the new one revealed **3 columns on `students` that existed in production but were never captured in the repo's SQL**: `pin_code`, `service_type` (default `'premium'`), `subscription_status` (default `'active'`). Added to both the database and `supabase-schema.sql`. Nothing else had drifted.

**7. Email — Timeweb mail, not Resend.** Resend has no Russian region (US/Ireland/Brazil/Japan only), which makes every send a cross-border transfer under Art. 12 with a Roskomnadzor notification duty. Switched to a `noreply@kaykitay.ru` mailbox on Timeweb: SPF, DKIM and DMARC were auto-configured, and domestic senders get materially better inbox placement at Mail.ru/Yandex. Outbound 25/465/587 are blocked by default on Timeweb — **these were unblocked on request** (2525 remains blocked).

**8. Branded Russian email templates** — `volumes/auth/templates/{magic_link,confirmation,recovery}.html`, brand palette, 6-digit code + magic link in the same message. First delivery landed in Gmail spam; after branding it landed in the **Inbox**.

**9. App repointed** — Timeweb env vars now target `db.kaykitay.ru`. Verified end-to-end: register → 200, login → 200 with a session cookie whose JWT `iss` is `https://db.kaykitay.ru`, and **RLS confirmed isolating** (3 rows in the table, an authenticated user sees exactly their own; anon sees `[]`). Test accounts cleaned up; the database is a clean slate.

**10. Backups** — `/usr/local/bin/supabase-backup.sh`, nightly 03:30 via `/etc/cron.d/supabase-backup`, `pg_dumpall` gzipped to `/opt/backups/postgres`, 14-day retention, verified by *content* (gzip integrity + core tables present), logging to `/var/log/supabase-backup.log`.

### Same day, second half — auth flow, consent, and two security fixes

**11. Email confirmation actually works now (`383e181`).** After the migration, registration still behaved like TEST MODE. The cause wasn't config: registration called `admin.auth.admin.createUser({email_confirm:true})`, and **admin-created users never trigger a confirmation email regardless of GoTrue settings**. Registration now uses `supabase.auth.signUp()`, which sends the branded template.
   - New route `POST /api/auth/verify-otp` — confirms with the 6-digit code and signs the user in via session cookies (no separate login step). The magic link in the same email does the same thing.
   - `resend-verification` rewritten to use `supabase.auth.resend()` (GoTrue → Timeweb SMTP) instead of generating a link and pushing it through Resend. One sender, one template, no cross-border transfer. Handles GoTrue's per-address rate limit with a 429.
   - `Login.tsx` gained a code-entry step, plus "Ввести код из письма" on the unverified-login error.
   - Registration detects GoTrue's **empty-`identities` decoy** for already-registered addresses (GoTrue returns a fake user rather than leaking that an address exists) and reports 409 instead of creating a duplicate profile.

**12. Human fallback for undelivered email.** The confirm screen carries "Письмо не пришло? … напишите в поддержку" → **`t.me/ash_china`**; the consultant then creates the account manually, pre-confirmed, and sends the password over Telegram. Doubles as an early-warning signal: a spike in fallback requests means deliverability is broken.

**13. Consent checkboxes (`7f8c16e`).** Registration now captures consent, enforced **server-side** as well as in the UI — a disabled button proves nothing.
   - `students.terms_accepted_at` (timestamptz), `marketing_consent` (bool, default false), `marketing_consent_at` (timestamptz). Timestamps rather than bare booleans because consent evidence is about *when*.
   - Terms are mandatory (400 without them); promo is opt-in and unchecked by default. Filter promotional sends on `marketing_consent = true`.

**14. `/terms` publishes the real Согласие на обработку персональных данных (`8f20931`).** Operator: Медведева Яна Олеговна, ИНН 230810218088. Two deliberate deviations from the source file: the preamble's `noreply@kaytikay.ru` is a **typo** (published as `kaykitay.ru`, since the typo'd domain isn't ours and section 6 is the consent-withdrawal address) — *fix the master copy*; and the checkbox no longer claims acceptance of a «пользовательское соглашение», which doesn't exist yet.

**15. 🔒 Security: admin was granted by a hardcoded email (`b7c353e`, `62d390d`).** Found while creating a real admin account. Access was gated on `user.email === 'admin@gmail.com'` — **and with open registration that address was unclaimed on the live app**. Whoever registered it would have had every student's personal data. Fixed in *two* layers:
   - **App layer (`b7c353e`)** — `getConsultantUser` now checks `students.role = 'consultant'` via the service-role client (so the caller's own RLS context can't influence it) and denies outright if that key is missing. Also removed the `auth/session` special case that returned `role: 'consultant'` for that email, and the list/delete routes' email filters.
   - **Database layer (`62d390d`)** — **four RLS policies** carried the same hardcoded email (`students` read, `documents` read + update, `storage.objects` read). This was *worse*: RLS applies to any client, so a JWT for that address could read everything straight through PostgREST with the public anon key, never touching the app. Now keyed on `public.is_consultant()`, a `SECURITY DEFINER` helper (a policy on `students` cannot `SELECT` from `students` without recursing).
   - **Symptom that exposed it:** the admin panel showed 0 students while the table held 3. The real admin didn't match the hardcoded address, so RLS returned only their own row, which the `role != 'consultant'` filter then excluded. *The empty panel was the security hole, not a separate bug.*

**16. Privilege-default cleanups** — same shape, consultant-era leftovers that were harmless then and wrong now:
   - `admin/students/create` hard-coded `service_type:'premium'`, `subscription_status:'active'`. The manual-account fallback would have handed every rescued user a **free paid subscription**. Now defaults to `diy`/`trial`, premium opt-in, and only premium gets the default document package.
   - `auth/session` defaulted a profile-less user to `premium`/`active` → now `diy`/`trial` (least privilege).

**17. Admin account** — `bigdaddy_admin@kaykitay.ru`, `role = 'consultant'`, created pre-confirmed. Credentials in `~/Downloads/kaykitay-admin-login.txt` (mode 600). **The generated password should be changed.** Verified both directions: admin reaches all admin routes and sees all 3 students; a plain student gets 403 on every admin endpoint and, querying PostgREST directly, sees only their own row.

---

## Session log — 2026-07-19/20

**Theme: the product was sellable but not defensible.** Access is now a one-time
purchase (10 000 ₽, first ten at 5–6 000 ₽ for custdev) covering **2 years**, sold
manually — no YooKassa for launch. That model makes one account worth sharing, so
this session closed the ways to take the product without paying for it. Commits
`d6056c2` → `2f71922`.

**1. 🔒 The paywall was client-side only — any free account could read every paid
lesson.** `/api/learning/module/[lessonId]` checked that you were authenticated and
nothing else. Verified against the live app: a `trial` user got `200` and 11 KB of
the apply-guide. The lock icons and paywall modal were decoration; the API behind
them was open to anyone who registered. Fixed with `getEntitledUser()` in
`src/lib/api.ts`, which checks entitlement through the **service-role** client so
the caller's own RLS context can't influence the answer (same reasoning as
`getConsultantUser`). *This was found by accident, while looking for where to
enforce the 2-year window — not by looking for it.*

**2. RLS audit complete (was Next Step #1).** All 16 policies read, not just
grepped: every one is correctly scoped to `student_id = uid()` or
`is_consultant()`, no hardcoded identities remain, no table is reachable by `anon`
(policies are all `{authenticated}`, so anon has zero applicable policies and RLS
fails closed), and `is_consultant()` is `SECURITY DEFINER` with a pinned
`search_path`. Then **proven empirically** rather than by reading: two real JWTs
against PostgREST — A sees exactly its own row, B's row returns `[]`, anon gets
`[]`, and **both escalation attempts failed at the database** (`role=consultant`
and `subscription_status=active` → 0 rows). Note `students` has *no* UPDATE policy,
which is why; don't add one.

**3. Access window + single-use PINs.** New `students.access_expires_at`; `verify-pin`
sets it to **+2 years** and clears `pin_code` in the same write. NULL = never
expires (staff, pre-window purchases) — nobody was locked out retroactively. An
expired window reports as `inactive` to the client so the UI relocks itself without
duplicating the rules; `getEntitledUser` is the real gate. PINs had been infinitely
reusable, which was harmless only until expiry existed — after that, any customer
could reactivate themselves forever from an old email.

**4. Device limit: 2 concurrent sessions.** No registry table — GoTrue already
tracks sessions in `auth.sessions`. `public.enforce_session_limit()` evicts
everything outside the N most recently **active** sessions (ordering by
`created_at` would evict the owner's own laptop and keep the freeloader).
Consultants are exempt, checked *inside* the SQL so it costs no extra round trip.
**Fails open** on RPC error — a broken session check must not lock out paying
customers.

**5. Column defaults were still `premium`/`active`.** The 07-18 session fixed two of
the three spots; the third (the column defaults themselves) was identified but
never applied. Demonstrated live: an INSERT omitting those columns came back
premium/active. Now `diy`/`trial` in both the DB and `supabase-schema.sql`.

**6. Onboarding tour ran once per *browser*, not per account.** `localStorage` under
one global key meant a second account on a shared computer got **no tour at all**,
the same account on a second device replayed it, and clearing site data replayed
it. Truth moved to `students.onboarding_completed_at` (surfaced as
`user.onboardingCompleted`); localStorage stays as a per-user-scoped cache
(`st_onboarded_v2:<uuid>`) purely to stop a flash before the session loads. Marking
is idempotent, so `?tour=1` doesn't overwrite the original timestamp — **completion
is now queryable data**.

**7. Silent degradation in the tour.** It launched on a fixed `400ms` timer and then
filtered its steps to nav targets present *at that instant*. On a device slow enough
to miss it, all six nav steps were dropped and the user got greeting-then-finale
with no error anywhere — affecting only users on the worst phones, i.e. the ones
who never report anything. Now polls up to 3s for the targets.

**8. A live service-role key nearly went into git.** `.gitignore` had `.env*.local`,
which does **not** match `.env.local.pre-selfhost.bak` — the backup made while
repointing local dev. Widened to `.env*`. History checked: only `.env.example` was
ever committed, and it's placeholders.

**9. Local `.env.local` was still the old stack** — supabase.com URL, the deleted
`PUBLISHABLE_KEY`, the old service-role key, Resend. `npm run dev` was reading and
writing **the wrong database in the wrong country**. Repointed at `db.kaykitay.ru`.
⚠️ **Local dev now writes to production** — there is no safe sandbox anymore.

**10. Watermark + artwork.** The lesson watermark was a fixed run of 36 spans, so it
covered only the top of a long lesson — i.e. not the part with most of the content.
Now a tiled repeating SVG carrying `email · КайКитай`. All ten doodles replaced with
v2 art and the tour sizing retuned by hand.

### Decisions taken this session (product)

- **Manual payments for launch.** No YooKassa. Someone messages Ashot or Iana → bank
  transfer → PIN issued by hand. The existing PIN flow already *is* this system, and
  early sales being conversations is worth more than the saved minutes. ⚠️ If taking
  money as самозанятый, each payment still needs a чек via «Мой налог».
- **2 years, not permanent.** Covers a 10th-grader through application; makes a
  resold account a depreciating asset. Extensions handled individually and free at
  Ashot's discretion.
- **9th graders: marketing decision, not a code one.** 2 years expires before they
  apply, so market to 10–11 and handle any 9th grader by hand.
- **Anti-sharing stops here for now.** Session limit + watermark shipped. No further
  DRM before there are real users to measure.

---

## Session log — 2026-07-20/24 (features, dark mode, content, LAUNCH)

Long session. Commits `0866ae6` → `097a003` on `diy-product`. Ends with the app **launched at `app.kaykitay.ru`**.

### Auth / registration fixes (shipped first — they were blocking real users)
1. **Magic link now signs you in.** GoTrue's `/auth/v1/verify` finishes by redirecting to `SITE_URL#access_token=…` — a URL *fragment*, which never reaches the server, and this app reads sessions from server-set cookies. So the link authenticated the user and threw the session away, landing them back on login. New route **`/auth/confirm`** (`src/app/auth/confirm/route.ts`) redeems the token hash server-side via `verifyOtp` and writes the cookies onto a **relative** redirect (no dependence on `NEXT_PUBLIC_APP_URL`, which was malformed and would `throw` in `new URL()`, and no dependence on `request.nextUrl.origin`, which is the container's internal bind address behind Timeweb's proxy — that sent users to `https://0.0.0.0:3000/`). The email templates on the VM were repointed from GoTrue's verify endpoint to `{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=…`. `recovery.html` still uses the old link but there is no password-reset flow, so it leads nowhere anyway. (`0866ae6`)
2. **Registration was blocked for EVERY new user since 7f8c16e (the consent checkboxes).** `handleSubmit` is a `useCallback` whose deps omitted `acceptedTerms`/`marketingConsent`, so it closed over the initial `false` and always posted `acceptedTerms:false` — the server rejected every signup with "Необходимо принять пользовательское соглашение", the one box the user had already ticked. The three pre-existing accounts predate the checkboxes, which is why nobody noticed. (`85249d2`, build-repair `05dfb4f`.)

### Document checklist with lead times, deadline calendar, deletes (`e72ebef` + migrations)
- Adding a university **seeds the standard document set** and dates each item as *(earliest university deadline − time to obtain it)* — «Заказать до», not «Дедлайн», because these are ordered not submitted. Catalogue in `src/lib/documentTemplates.ts`; seed/reschedule logic in `src/lib/studentDocuments.ts`. Shared docs seed once; only мотивационное письмо is per-university. Manually-edited dates are marked `deadline_manual` and never auto-move.
- **Deletes** on documents and universities. Standard docs are **soft-deleted** (`deleted_at`) so the next reseed doesn't resurrect them; hand-added ones are removed for real.
- **Deadlines tab** is now a month calendar (`src/components/DeadlineCalendar.tsx`), merging document + university dates + student-added собеседования/экзамены. **Overdue items are shown, not hidden** — the old `isUpcoming` filter made a behind-schedule student see an empty calendar.
- Fixes found along the way: a PostgREST many-to-one embed is an **object, not an array**, so documents tied to a university displayed as «все»; and **deletes had no RLS policy**, so they matched zero rows — which PostgREST reports as success. Four migrations run against prod (all captured as `.sql` files + folded into `supabase-schema.sql`): `supabase-document-templates.sql`, `supabase-delete-policies.sql`, `supabase-document-soft-delete.sql`, `supabase-deadline-events.sql` (the last also added INSERT/UPDATE/DELETE policies to `deadlines`, which previously had SELECT only).

### Экзамены free module (replaced the locked «Как оплатить…» card)
IELTS, TOEFL, CSCA, Duolingo guides (`src/content/exams/`, route `/api/learning/exam/[examId]`, whitelist lookup — no path built from the param). Real logos for IELTS/TOEFL/Duolingo in `public/images/exams/`; **CSCA has no logo** — the file supplied was «China Standard Conformity Assessment Co.», an unrelated ISO-cert company sharing the acronym. TOEFL Home-Edition-rejected-by-some-vuzy and Duolingo's patchy acceptance are the key traps documented. Per-country IELTS/TOEFL booking links; **no hardcoded exam dates** (IELTS is per-centre, TOEFL 2027 dates aren't released) — the guides explain scheduling instead.

### Dark mode (`a054e9e`)
- The `study` palette moved to **CSS variables** so a theme swap costs no per-component edits. Light values are byte-identical to before. Two extra tokens: `--study-overlay` (modal scrims — dark in both themes) and `--study-inverse` (surfaces that carry white text, e.g. the pyramid top tier — reusing `study-dark` put white-on-white once it inverts).
- Toggle: pill switch (`src/components/ThemeSwitch.tsx`) in the sidebar, mobile header, mobile menu, and the desktop page header. Follows OS on first visit then remembers. **Anti-flash init script inlined in `<head>`** (`ThemeContext.tsx` `THEME_INIT_SCRIPT`) applies the theme before first paint.
- 137 literal `bg-white` → themed card token; stock Tailwind tints (`bg-red-50` etc.) across ~27 infographics got `dark:` variants; card shadows redone (black shadow is invisible on dark). Themed logo (`src/components/Logo.tsx`, light/dark PNGs swapped by CSS). **Form controls** (later, `247a338`): a global `:where(input,select,textarea)` rule themes text + placeholder and gives fields a recessed dark background — native controls render browser-white otherwise, unreadable on dark modals.

### Onboarding tour hardened (`b3ee276`)
Doodles now **preloaded** (they only downloaded when their step rendered, so on mobile the characters never appeared) and resized 4.4 MB → 1.6 MB. **Completion only counts if the user reached the last step** — `driver.js` fires `onDestroyed` on *any* dismissal, so closing early used to burn the once-per-account tour forever. `localStorage` key bumped to `v3` (the v2 flag was written before the server call, so browsers held "seen" flags for accounts whose `onboarding_completed_at` was still null).

### «Жизнь в Китае» module + per-lesson summaries (`a25ddd2`)
- New paid two-lesson module under the three tutorial tracks (wide card → `setActiveModule` → lesson list): **Полезные приложения** (25 apps, App Store screenshots in `public/images/life-china/`, sourced from `useful_apps_pics/` which is **not** committed) and **Что купить в общежитие** (table of items with live Taobao `e.tb.cn` links — those expire over time; each row keeps the 「中文」 name to re-search).
- **Hardcoded «Краткое резюме» for 20 lessons**, hoisted to module scope in `LearningStart.tsx` as `AI_SUMMARY`, keyed by `lessonKey`, with the loading→typing animation. ⚠️ **These are hardcoded — editing a lesson's substance does NOT update its summary.** Skips the two life-china lists and the shortest guide (duolingo).

### SMM (Alisa) content review (`b858a3e`)
Кейсы поступлений: dropped 3 near-empty columns, admissions sorted first then by completeness, sparse fields moved to a per-row detail line, copy rewritten to state these are **open-source reference cases, not our students'** (consent posture). intro/how-to-choose/exam edits; Справка о несудимости reframed as unpredictable timing (leadTimeDays 45→60); медобследование gained psychological-check + minor-deviations notes; b1 profile table and program-comparison table made fillable with **localStorage + CSV download + clear**; DirectionCitiesMatrix made read-only (its selection led nowhere). ⚠️ **Lesson infographics are injected positionally** («the Nth list/table in section X»); several b1 injections were dead because the markdown lost its numbered headings, and editing lesson markdown can silently drop an infographic. Consider anchoring on explicit `<!-- component -->` markers someday.

### Checklist row (`247a338`)
Status tick and document name are now **separate tap targets** — tapping the name opens an info card (full name + details) on mobile / shows a desktop hover tooltip; the tick still toggles готово/upload. Fixes truncated names being unreadable.

### Consultant doodle
Cropped `consultant.png` to the figure and re-tuned the peek transforms; made only the figure tappable (the invisible `opacity:0` label pill was a hit target, so a stray tap opened Telegram).

### 🚀 LAUNCH (2026-07-24) — `app.kaykitay.ru`
1. **Pushed all of the above first** so the launched site is current, not the stale build. (Learned the hard way earlier: always build a clean/env-less checkout before pushing — Timeweb's Docker build has no env vars.)
2. **Bound `app.kaykitay.ru`** to the `-9bc8` app via the Timeweb app panel → «Домены» → «+ Внешний домен». Gotcha: the dropdown only lists whole domains (`kaykitay.ru`), so a subdomain goes through «Внешний домен»; and the user first landed in the **wrong app** (`-51d7`, serves 404) — always confirm the panel shows the `-9bc8` host. A hand-added `A app → 104.171.138.217` record was **wrong** (that IP is the Supabase VM, not the app); Timeweb auto-manages the record once bound.
3. **Repointed auth URLs** on the VM: `SITE_URL=https://app.kaykitay.ru`, added `app.kaykitay.ru` + the twc1 host to `ADDITIONAL_REDIRECT_URLS`, restarted GoTrue. Backup at `/opt/supabase/docker/supabase-project/.env.bak-predomain-*`.
4. **Verified end-to-end**: `app.kaykitay.ru` = 200 + valid TLS + latest bundle; a real magic-link token redeemed over the new domain signs a user in.

**⚠️ mail.ru deliverability (open):** Gmail/Yandex receive the verification email; **mail.ru does not**. GoTrue logs show the send succeeds with no SMTP error (~600–900 ms handoff to `smtp.timeweb.ru`), so it fails downstream between Timeweb's relay and mail.ru. SPF (`include:_spf.timeweb.ru ~all`), DKIM (selector `dkim`), DMARC (`p=none`), MX all present and correct. Almost certainly mail.ru reputation-filtering Timeweb's shared relay IP (or landing in Спам). Next moves: check mail.ru Spam; check `Authentication-Results` on a Gmail-received copy; register kaykitay.ru at **postmaster.mail.ru**; open a Timeweb ticket about the relay IP vs mail.ru. Then tighten SPF `~all→-all` and DMARC `p=none→p=quarantine`.

**⚠️ `useful_apps_pics/` and `ProdVersion_doodles/`** are uncommitted scratch/source folders in the repo root — leave them out of commits. `China_Universities_Programs.json` (one link edited by the user) IS committed now.

---

## Self-hosted Supabase — operating notes

| | |
|---|---|
| Server | `104.171.138.217` (`ssh root@…`, key-only) |
| Project dir | `/opt/supabase/docker/supabase-project` |
| Secrets | that dir's `.env` (mode 600) — Postgres password, JWT secret, anon/service keys, dashboard login |
| Manage | `sh run.sh start\|stop\|restart\|status\|logs [service]` |
| Studio (admin UI) | `https://db.kaykitay.ru` — basic auth, creds in `.env` (`DASHBOARD_USERNAME`/`DASHBOARD_PASSWORD`) |
| Compose layers | `COMPOSE_FILE=docker-compose.yml:docker-compose.caddy.yml:docker-compose.mail.yml` |
| Custom override | `docker-compose.mail.yml` — the nginx template server + GoTrue mail config (kept separate so upstream updates don't clobber it) |
| Backups | `/opt/backups/postgres`, nightly 03:30, 14 days |
| Admin login | `bigdaddy_admin@kaykitay.ru` — creds in `~/Downloads/kaykitay-admin-login.txt` (mode 600) |
| Admin authority | `students.role = 'consultant'` — both in app code and in RLS via `public.is_consultant()`. Promote with `update public.students set role='consultant' where email='…'` |
| Mail | `noreply@kaykitay.ru` via `smtp.timeweb.ru:587`; templates in `volumes/auth/templates/`, served to GoTrue by the internal `mail-templates` nginx |

---

## Infrastructure migration (Vercel+Supabase → Russian)

**Why:** 152-FZ requires Russian citizens' personal data on Russian servers. DB + Storage + Auth must move before onboarding real students.

**Status:** ✅ **DONE (2026-07-18).** Hosting, database, auth, storage and email all run on Russian infrastructure. supabase.com and Resend are out of the request path. The old supabase.com project still exists untouched — useful as a rollback and as the reference for any further schema-drift checks, but it should be decommissioned once you're confident.

### ✅ Decision locked: **Path A — self-host Supabase on a Timeweb VM**

Run the open-source Supabase stack (Postgres + Auth + Storage) via `docker compose` on a Timeweb **Cloud Server**, then repoint the app's env vars at it. Code stays ~identical — same `supabase-js`, same auth, same storage API. "Move the data = move auth", one migration.

**Path B was evaluated and rejected for now** (Timeweb Managed Postgres + S3 + NextAuth). It's the cleaner long-term destination, but it's far bigger than it looks in this codebase:
- Managed Postgres has **no PostgREST**, so every `supabase.from(...)` call across ~30 API routes must be rewritten to Drizzle/SQL — the whole data layer, not just auth.
- Dropping Supabase Auth kills `auth.uid()`, so **every RLS policy** must be re-implemented as explicit ownership checks in app code — the highest-risk part (this is where data leaks happen).
- Realistic estimate 7–11 days. **Plan: launch on A, migrate to B later**, calmly, with real load data to justify it.

**Path A steps — all complete (2026-07-18):**
1. ✅ Timeweb Cloud Server provisioned (2 vCPU / 4 GB / 50 GB, Ubuntu 24.04, Moscow).
2. ✅ Stack up via `docker compose`; firewall + SSH locked down.
3. ✅ Schema restored (+3 drifted columns found and fixed). Data migration was a no-op — no real users, and document upload is disabled by product decision.
4. ✅ Timeweb app env vars repointed; verified end-to-end incl. RLS isolation.
5. ✅ Nightly `pg_dumpall` backups with content verification + 14-day retention.

**Remaining VM "babysitting" duties:** OS security updates (`unattended-upgrades` is *not* configured yet), Supabase stack version bumps, cert renewal (automatic via Caddy, but worth watching), and moving backups off-box.

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
NEXT_PUBLIC_SUPABASE_URL            # NOW: https://db.kaykitay.ru  (was *.supabase.co)
NEXT_PUBLIC_SUPABASE_ANON_KEY       # self-hosted anon JWT (from the VM's .env)
SUPABASE_SERVICE_ROLE_KEY           # self-hosted service_role JWT — real secret, bypasses RLS
RESEND_API_KEY                      # app-side email only; auth email goes via Timeweb SMTP now
NEXT_PUBLIC_APP_URL                 # the deploy's own domain (Timeweb: the *.twc1.net URL)
CASES_SHEET_ID                      # optional — Мои шансы falls back to built-in data
```

Without the Supabase vars the API routes return setup errors and nothing loads.

⚠️ `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` was **deleted** in the cutover. `src/lib/supabase/config.ts` reads `ANON_KEY ?? PUBLISHABLE_KEY`, so a stale `PUBLISHABLE` value would be shadowed by `ANON_KEY` and silently do nothing — but leaving an old supabase.com credential lying around is a trap for a future debugging session. Note the `??` only falls back on `null`/`undefined`, **not** on empty string: an empty `ANON_KEY` breaks the app rather than falling through.

**Auth/mail env now lives on the VM**, in `/opt/supabase/docker/supabase-project/.env` — `SMTP_HOST=smtp.timeweb.ru`, `SMTP_PORT=587`, `SMTP_USER=noreply@kaykitay.ru`, plus `SITE_URL`/`API_EXTERNAL_URL`/`ADDITIONAL_REDIRECT_URLS`. When the app moves to `kaykitay.ru`, `SITE_URL` must be updated there too or magic links will point at the old `*.twc1.net` host.

---

## Next Steps (priority order)

Launch is done; these are the post-launch priorities. Several older items are now closed (magic link, domain move, dark mode).

1. **🔴 mail.ru email deliverability** — verification emails don't reach mail.ru (Gmail/Yandex fine). Blocks a chunk of real signups. See the launch session log for the diagnosis and the fix sequence (postmaster.mail.ru registration, Timeweb ticket, check Спам). Highest-priority because it silently costs signups.
2. **Tell the buyer about the 2-year window.** Still enforced in code, stated *nowhere* in UI or terms. Refund-argument shape; frame as «2 года доступа к постоянно обновляемой платформе».
3. **Test the PIN → paid-access flow end to end.** Admin sets `pin_code` → student enters it → `/api/auth/verify-pin` flips `subscription_status` to `active` and sets `access_expires_at` +2y. **Still not exercised since the cutover**, and it's the money path.
4. **Missing legal documents.** `/terms` has only the Согласие. **Политика обработки персональных данных** (referenced by section 7 of the consent users already sign; required under 152-FZ) and a **Пользовательское соглашение** don't exist. Consent covers only *username + email*.
5. **Payment / self-serve subscription — YooKassa** *(decided; not built)*. create-payment → `confirmation_url` → webhook on `payment.succeeded` → generate PIN → email → existing `verify-pin` activates. Needs a legal entity.
6. **Set `NEXT_PUBLIC_APP_URL=https://app.kaykitay.ru`** in the Timeweb app env (old value has no scheme). Not urgent — `/auth/confirm` uses relative redirects — but it's the correct value.
7. **Delete the dead `-51d7` Timeweb app** (leftover, serves 404, may cost money) and **decommission Vercel** (still points at supabase.com — split-brain risk the moment anyone registers there).
8. **Reset the 3 review accounts to `trial`** before real sales — `ashot1hovh@gmail.com`, `ashoth1g@163.com`, `ashot.sinoservices@gmail.com` were set `subscription_status='active'`, `access_expires_at=null` (never expires) this session so paid content could be reviewed. They're active in prod. Decide which to keep as staff/demo.
9. **Change the admin password** from `~/Downloads/kaykitay-admin-login.txt`.
10. **Chunk-load resilience (optional).** After a redeploy, a user on the old page can hit a `ChunkLoadError` clicking a link whose lazy chunk was replaced. An error boundary that auto-reloads on chunk errors makes deploys seamless. Not built.
11. **Grow the Кейсы поступлений dataset** — real admission outcomes are a recurring moat.
12. **Mobile QA pass** on a real phone (lesson reader, video modal, calendar, tour, consultant widget, code-entry, the new checklist info card).
13. **Finish the CSCA exam guide's logo + review the content** with Iana; and confirm the mail-medical "psychological check" claim (currently hedged).

### Safe-deploy playbook (the app is LIVE now — real users)
The app is **stateless**: sessions are JWT cookies validated against GoTrue, data is in Supabase. So a Timeweb rebuild/restart does **not** log users out or lose their state — the only exposure is a ~10–30s window where a fresh page-load or in-flight request may error (a reload fixes it).
1. **Build env-less locally before every push:** `mv .env.local .env.local.bak && npm run build; mv .env.local.bak .env.local`. Reproduces Timeweb's env-less Docker build and catches failures before they hit prod. (Do NOT `git worktree` + symlink `node_modules` for this — `git worktree remove --force` follows the symlink and wipes the real `node_modules`; happened this session, recovered with `npm ci`.)
2. **DB migrations: additive-only, expand-contract.** Adding → migrate DB **first** (`if not exists`, nullable/defaulted), then push code. Removing/renaming → deploy code that stops using it, wait, drop the column **later**. Never drop/rename a column in the same deploy as the code that depends on it.
3. **Push off-peak** (late MSK), watch the bundle hash change, smoke-test login + a couple of routes.
4. Rollback is safe because migrations are additive — reverting a code commit doesn't break the DB.

### Housekeeping
- **⚠️ Local dev writes to PRODUCTION.** `.env.local` points at `db.kaykitay.ru`. No sandbox. During this session, review accounts were also given permanent `active` access — see Next Step #8.
- ~~Crop the transparent padding off the doodles~~ — ✅ the consultant doodle was cropped + re-tuned; the others are resized (tour doodles 4.4 MB → 1.6 MB) but not padding-cropped.
- **Admin session sprawl:** consultants are exempt from the device limit *and* nothing prunes their sessions, so the admin account accumulates them without bound. Harmless for two staff accounts. Don't let `role='consultant'` become a general "trusted user" flag — it is now also an exemption from sharing limits.
- **Commit the email templates** into the repo (`infra/email-templates/`) — they exist only on the VM.
- **Three real accounts** on the self-hosted DB: `ashot1hovh@gmail.com`, `ashoth1g@163.com`, `ianadved@yandex.ru` (all testing) + the admin. They registered *before* the consent deploy, so their `terms_accepted_at` is null — expected, not a bug. All are `diy`/`trial`, so **they now hit the paywall** on lessons — that's the server-side gate working, not a regression.
- ~~Delete the probe account~~ — moot; it lives in the old supabase.com project, which is out of the request path.
- **Decommission the supabase.com project** once confident in self-hosting. Keep it until then as rollback + schema reference.
- **Move backups off-box** — they currently sit on the same VM as the database.
- **Configure `unattended-upgrades`** on the VM for OS security patches; not set up yet.
- `src/data/China_Universities_Programs.json` — the user edited one link; **now committed**. 67 of 182 universities still have no programs listed (English-taught) → the explorer shows «обучение на китайском» for those.
- `src/lib/supabase/client.ts` (browser Supabase client) is **dead code** — safe to delete.
- **Commit the email templates** into the repo (`infra/email-templates/`) — still only on the VM.
- **`useful_apps_pics/` (repo root)** — the source App Store screenshots for the Жизнь-в-Китае apps lesson; already copied into `public/images/life-china/`, so this folder is scratch — don't commit, safe to delete.
- **Lesson summaries are hardcoded** (`AI_SUMMARY` in `LearningStart.tsx`) — if a lesson's content changes materially, update its summary by hand or it goes stale.

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

### Gotchas from 2026-07-19/20

- **A client-side paywall is not a paywall.** The lock icon and the modal were UI; the API behind them checked authentication only. Whenever a route serves something people pay for, the gate belongs in the route — and the entitlement lookup must use the service-role client so the caller's own RLS context can't influence the answer.
- **Deleting a row from `auth.sessions` invalidates its access token immediately.** GoTrue re-checks the session on every `getUser()`; there is no "valid until exp" window. Good for security, but it means an evicted request fails auth *before* your own logic runs — so you can't explain the eviction from there without a breadcrumb (`public.evicted_sessions`).
- **`supabase.auth.getSession()` returns null once the session row is gone** (its refresh fails), and **supabase-ssr clears the auth cookie as a side effect of the failed `getUser()`**. To read the token of a dead session, parse the cookie yourself *before* calling `getUser()`. Both of these produced an identical bare `401`, so testing "does eviction happen" passed while "does the user learn why" silently failed.
- **`.env*.local` does not match `.env.local.anything.bak`.** Use `.env*`. A live service-role key was one `git add -A` from a public repo.
- **A fixed `setTimeout` before querying the DOM is a silent failure on slow devices.** The tour dropped every anchored step when the nav hadn't painted in 400 ms, and reported nothing. Poll for the element instead — and remember the users this hits are the ones least likely to tell you.
- **`localStorage` answers "has this browser seen it", never "has this user seen it".** Anything per-account belongs on the account, or a shared computer swallows it for the next person.
- **PostgREST caches its schema**, so a newly created table can 404 until it reloads — but it picked up `evicted_sessions` immediately here, so check before blaming the cache.
- **Verify what the user experiences, not what the system does.** Eviction worked on the first run; the *message* didn't, and only a test that asserted on the response body caught it. Same lesson as the GoTrue email templates on 07-18.

### Self-hosting gotchas (2026-07-18 — each cost real time)

- **Docker Hub rate-limits by IPv6 prefix.** Pulls failed with `429 Too Many Requests`; the header `docker-ratelimit-source: 2a03:6f00:a::` showed the limit was attributed to Timeweb's **shared /48 IPv6 block**, not the server. Fix: IPv6 is disabled host-wide in `/etc/sysctl.d/99-disable-ipv6.conf` so pulls go over the dedicated IPv4. **If IPv6 is ever re-enabled, image pulls will start failing again.**
- **`Permission denied (publickey)` can mean the client, not the server.** Hours were lost on a key that was correct all along. sshd logged `Accepted key … found at /root/.ssh/authorized_keys:1` followed by `Postponed publickey` — i.e. the server accepted the key and asked for a signature, and the *client* couldn't sign because the key has a passphrase and the connection used `BatchMode=yes` (which forbids prompting). Fix: `ssh-add --apple-use-keychain ~/.ssh/id_ed25519`. **Read the server's auth log before theorising about server config.**
- **Timeweb may not install your SSH key at provisioning** even with the key checkbox ticked. Add it manually via the VNC console (`/root/.ssh/authorized_keys`).
- **`GOTRUE_MAILER_TEMPLATES_*` are URLs, not file paths.** Pointing them at a mounted file makes GoTrue resolve the path against `SITE_URL`, 404, and **silently fall back to its default English templates** — no error unless you look for `templatemailer` in the logs. Solved with an internal nginx (`mail-templates` service in `docker-compose.mail.yml`) serving them over the Docker network at `http://mail-templates/*.html`. **Verification of an email template means looking at the received email — "no errors in the logs" proves nothing.**
- **`403 "You cannot consume this service"` on `/rest/v1/` is not a bug.** Kong restricts the PostgREST OpenAPI root to the `admin` group by design; anon keys get 403 there but work fine on table routes like `/rest/v1/students`.
- **`pg_dumpall` of an empty database is ~46 KB.** Don't size-check backups; check their *contents* (the backup script greps for core `CREATE TABLE` statements).
- **The repo's `.sql` files can drift from production.** `pin_code`, `service_type` and `subscription_status` existed on supabase.com but were never written back to `supabase-schema.sql` — registration broke on cutover. To diff a live Supabase against a local one, fetch the PostgREST OpenAPI spec (`GET /rest/v1/` with the service-role key); its `definitions` list every table's columns. **If you add a column via the Studio UI, write it into the `.sql` file too.**
- **Admin `createUser` never sends a confirmation email**, whatever GoTrue is configured to do. If registration must send one, it has to go through the anon client's `signUp()`. This is why the app looked stuck in TEST MODE after the migration — no config change could have fixed it.
- **`signUp` returns a decoy user for an already-registered address** — a real-looking object with `identities: []` — so the endpoint can't be used to enumerate accounts. Check that array before treating a signup as new.
- **Audit RLS policies for hardcoded identities, not just app code.** A permission rule wrong in the app is very likely wrong in the database too, and the database version is worse: RLS applies to *any* client, so it's reachable through PostgREST with the public anon key without touching the app. The query:
  ```sql
  select tablename, policyname, cmd, qual, with_check from pg_policies
  where coalesce(qual,'') like '%suspect%' or coalesce(with_check,'') like '%suspect%';
  ```
- **A policy on a table cannot `SELECT` from that same table** — RLS recurses. Put the lookup in a `SECURITY DEFINER` function (see `public.is_consultant()`), which runs as the owner and bypasses RLS for that query.
- **Watch for privilege defaults from the consultant era.** Three separate spots defaulted users to `premium`/`active` (`admin/students/create`, `auth/session` fallback, and the `students` column defaults). Harmless when every user was a paying client; in a DIY product each one silently gives away paid access. Default to the *least* privileged state.
- **`$$` in SQL gets eaten by the shell** when passed through `ssh '...'` — zsh expands it to a PID, producing baffling errors like `coalesce types text and bigint cannot be matched`. Write the SQL to a file and `scp` it.
- **Beware self-matching `pgrep`/`pkill` patterns.** `pgrep -f "docker compose pull"` matches the shell running the script that contains that string, so a wait loop never exits; `pkill -f "while pgrep"` kills its own session. Use a bracket trick (`whi[l]e pgrep`) or a different signal entirely.
- **"No errors in the logs" is not verification.** GoTrue silently fell back to default email templates for ~20 minutes while the logs looked clean — the failure was one `templatemailer` line that a narrow grep missed. Verify the observable outcome (the received email, the rendered page), not the absence of complaints.
- **Safari-only load failures** on the `*.twc1.net` app appeared once and resolved on their own. TLS was verified clean (GlobalSign, full chain, TLS 1.3), so the likely cause is iCloud Private Relay, which proxies Safari but not Chrome on iOS. If it recurs, get the exact Safari error text — "cannot find server" (DNS), "server stopped responding" (relay path) and a blank white page (app-side JS) point in completely different directions.
