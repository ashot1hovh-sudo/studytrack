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
- **Timeweb Cloud — Docker app, Moscow** — Russian-market deploy, **LIVE**: `https://ashot1hovh-sudo-studytrack-9bc8.twc1.net`, talking to the self-hosted Supabase above.
- **Timeweb mail** — `noreply@kaykitay.ru` via `smtp.timeweb.ru:587`, SPF/DKIM/DMARC configured. Sends all auth email.
- **Domain** — `kaykitay.ru` (registered at Timeweb 2026-07-18)
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

1. **Magic link / OTP login flow — app side** *(decided 2026-07-18; server side already done)*. The email now carries **both** a magic link and a 6-digit code; either completes login. GoTrue and the templates are configured and verified. What's left is entirely in the app: an email-entry screen → a code-entry screen, swapping the password calls for `supabase.auth.signInWithOtp()` / `verifyOtp({ email, token })`, and deciding whether password login stays as a fallback.
   - **Keep passwords as a fallback for launch.** Email deliverability is the most fragile part of the system, and with magic-link-only, a spam-foldered message is a total lockout, not an inconvenience.
   - **Naming:** call this «код подтверждения» / `otp` in the UI and code. The existing `pin_code` + `/api/auth/verify-pin` are the *subscription* unlock and are unrelated — two different 6-digit "codes" in one product will confuse users and future readers.
2. **Payment / self-serve subscription — YooKassa (ЮKassa)** *(decided; not built)*. Today there is **no self-serve upgrade path**: the consultant sets `pin_code` manually via `/api/admin/students/update-subscription`, and the student enters it. Target flow: create-payment route → YooKassa `confirmation_url` → webhook on `payment.succeeded` → generate a PIN → email it → the existing `/api/auth/verify-pin` already flips `subscription_status` to `active`. Requires a legal entity (самозанятый/ИП/ООО). **Email is no longer a blocker here** — `noreply@kaykitay.ru` works.
3. **Re-enable email verification** — flip `email_confirm` back to `false` in `src/app/api/auth/register/route.ts` and restore the confirmation-email block (both marked `TEST MODE`). No longer blocked: sender domain is verified and delivering. Note the app creates users via `admin.auth.admin.createUser({ email_confirm: true })`, which **bypasses** GoTrue's `ENABLE_EMAIL_AUTOCONFIRM=false` — so this is purely a code change, not a config one.
4. **Move the app to `kaykitay.ru`** — point the apex/`www` at the Timeweb app, update `NEXT_PUBLIC_APP_URL`, and update `SITE_URL` in the VM's `.env` so magic links resolve to the right host. Also lets the email templates use the real logo (currently a text wordmark, deliberately — see gotchas).
5. **Deliverability hardening** — test against Mail.ru / Yandex / Rambler inboxes (not Gmail; wrong audience). Once confident nothing legitimate fails, tighten DMARC from `p=none` to `p=quarantine`. Ask Timeweb what the mailbox's outbound sending limit is — with magic links it's one email *per login*, so volume scales faster than signups.
6. **Grow the Мои шансы dataset** — real admission outcomes are a recurring moat; keep it fresh.
7. **Mobile QA pass** on a real phone before launch (lesson reader, video modal/iframe, tracker + table tap targets, and the new tour + consultant widget).

### Housekeeping
- ~~Delete the probe account~~ — moot; it lives in the old supabase.com project, which is out of the request path.
- **Decommission the supabase.com project** once confident in self-hosting. Keep it until then as rollback + schema reference.
- **Move backups off-box** — they currently sit on the same VM as the database.
- **Configure `unattended-upgrades`** on the VM for OS security patches; not set up yet.
- `src/data/China_Universities_Programs.json` has an **uncommitted local modification** predating the 07-15 session — decide whether to keep or discard it.
- `src/lib/supabase/client.ts` (browser Supabase client) is **dead code** — safe to delete.
- Consider committing the email templates into the repo (`infra/email-templates/`); they currently exist only on the VM.

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

### Self-hosting gotchas (2026-07-18 — each cost real time)

- **Docker Hub rate-limits by IPv6 prefix.** Pulls failed with `429 Too Many Requests`; the header `docker-ratelimit-source: 2a03:6f00:a::` showed the limit was attributed to Timeweb's **shared /48 IPv6 block**, not the server. Fix: IPv6 is disabled host-wide in `/etc/sysctl.d/99-disable-ipv6.conf` so pulls go over the dedicated IPv4. **If IPv6 is ever re-enabled, image pulls will start failing again.**
- **`Permission denied (publickey)` can mean the client, not the server.** Hours were lost on a key that was correct all along. sshd logged `Accepted key … found at /root/.ssh/authorized_keys:1` followed by `Postponed publickey` — i.e. the server accepted the key and asked for a signature, and the *client* couldn't sign because the key has a passphrase and the connection used `BatchMode=yes` (which forbids prompting). Fix: `ssh-add --apple-use-keychain ~/.ssh/id_ed25519`. **Read the server's auth log before theorising about server config.**
- **Timeweb may not install your SSH key at provisioning** even with the key checkbox ticked. Add it manually via the VNC console (`/root/.ssh/authorized_keys`).
- **`GOTRUE_MAILER_TEMPLATES_*` are URLs, not file paths.** Pointing them at a mounted file makes GoTrue resolve the path against `SITE_URL`, 404, and **silently fall back to its default English templates** — no error unless you look for `templatemailer` in the logs. Solved with an internal nginx (`mail-templates` service in `docker-compose.mail.yml`) serving them over the Docker network at `http://mail-templates/*.html`. **Verification of an email template means looking at the received email — "no errors in the logs" proves nothing.**
- **`403 "You cannot consume this service"` on `/rest/v1/` is not a bug.** Kong restricts the PostgREST OpenAPI root to the `admin` group by design; anon keys get 403 there but work fine on table routes like `/rest/v1/students`.
- **`pg_dumpall` of an empty database is ~46 KB.** Don't size-check backups; check their *contents* (the backup script greps for core `CREATE TABLE` statements).
- **The repo's `.sql` files can drift from production.** `pin_code`, `service_type` and `subscription_status` existed on supabase.com but were never written back to `supabase-schema.sql` — registration broke on cutover. To diff a live Supabase against a local one, fetch the PostgREST OpenAPI spec (`GET /rest/v1/` with the service-role key); its `definitions` list every table's columns. **If you add a column via the Studio UI, write it into the `.sql` file too.**
- **Safari-only load failures** on the `*.twc1.net` app appeared once and resolved on their own. TLS was verified clean (GlobalSign, full chain, TLS 1.3), so the likely cause is iCloud Private Relay, which proxies Safari but not Chrome on iOS. If it recurs, get the exact Safari error text — "cannot find server" (DNS), "server stopped responding" (relay path) and a blank white page (app-side JS) point in completely different directions.
