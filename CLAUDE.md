# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev      # Start dev server (Next.js on http://localhost:3000)
npm run build    # Production build
npm run lint     # ESLint via next lint
```

There are no tests. There is no separate type-check script; type errors surface during `npm run build`.

## Environment Setup

Copy `.env.example` to `.env.local` and fill in:
- `NEXT_PUBLIC_SUPABASE_URL` — Supabase project URL
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` — Supabase anon/publishable key
- `SUPABASE_SERVICE_ROLE_KEY` — service role key (server-side admin operations only)

Run SQL files in this order against your Supabase project to set up the database:
1. `supabase-schema.sql` — tables, enums, RLS policies
2. `supabase-admin.sql` — adds `review_comment`, `review_file_url`, `age`, `program` columns + consultant RLS policies
3. `supabase-storage.sql` — creates the `documents` storage bucket and its policies

## Architecture

**Single-page app (SPA) in Next.js 14 App Router.** There is only one page (`src/app/page.tsx`). Navigation between sections (Dashboard, Checklist, Universities, Deadlines) is purely client-side tab switching via `AppContext.activeTab` — there are no URL routes for sections.

**Three views based on auth state:**
1. `<Login />` — unauthenticated
2. `<AdminDashboard />` — authenticated as `admin@gmail.com` (hardcoded consultant identity check)
3. `<Sidebar /> + <Dashboard />` — all other authenticated users (students)

**State: `src/context/AppContext.tsx`** is the single global context. It owns auth state (`isAuthenticated`, `user`, `isAuthLoading`), active tab, and parent mode toggle. Auth is managed by calling Next.js API routes (`/api/auth/*`) rather than the Supabase JS client directly in the browser.

**Parent mode** is a client-side UI toggle (no server enforcement) that hides document upload controls and shows a simplified view for parents watching over a student's progress.

**API routes (`src/app/api/`)** are Next.js Route Handlers. Every handler follows the same pattern:
1. Check `missingSupabaseEnv()` and return a 500 if unconfigured
2. Call `getAuthenticatedUser()` or `getConsultantUser()` from `src/lib/api.ts` to get the Supabase server client and verified user
3. Query/mutate Supabase

`getConsultantUser()` enforces admin access by checking `user.email === 'admin@gmail.com'`.

**Three Supabase clients:**
- `src/lib/supabase/client.ts` — browser client (`createBrowserClient`), for any client component that needs direct Supabase access
- `src/lib/supabase/server.ts` — server client (`createServerClient` with cookie store), used in all API route handlers
- `src/lib/supabase/admin.ts` — service-role client (bypasses RLS), used only in admin endpoints that need to create/delete auth users or write on behalf of students

**File uploads** go to the Supabase Storage bucket `documents`. Storage paths follow the pattern `{userId}/{documentId}/{timestamp}-{filename}`. Files are private (not public bucket). Signed URLs are generated server-side on demand. Allowed types: PDF, JPG, PNG, max 10 MB.

**Sections vs Components:**
- `src/sections/` — full page/panel views (Dashboard, AdminDashboard, Checklist, Universities, Deadlines, Roadmap, NextActionBanner). Each section fetches its own data from the API on mount.
- `src/components/` — smaller reusable pieces (Login, Sidebar, SectionState loading/empty/error states)
- `src/components/ui/` — shadcn/ui primitives (Radix UI wrappers); do not modify these directly

**Styling:** Tailwind CSS with a custom `study-*` palette defined in `tailwind.config.js`:
- `study-bg` `#F2F4F8` — page background
- `study-brown` `#6B4F4B` — primary accent / active states
- `study-green` `#4A6741` — success / approve actions
- `study-orange` `#F59E0B` — warnings / urgent items
- `study-red` `#EF4444` — destructive actions
- `study-dark` `#2B2D42` — primary text
- `study-gray` `#8D99AE` — secondary text
- `study-lightgray` `#E2E8F0` — borders

UI text is in Russian throughout.

**Types** are centralized in `src/types/studytrack.ts`. The camelCase TypeScript types map to snake_case Postgres columns; conversion happens in each API route handler (no ORM).

**Database schema key relationships:** every data table (`universities`, `documents`, `deadlines`, `roadmap_stages`, `next_actions`) has a `student_id uuid` FK to `students.id`. RLS policies ensure students only see their own rows. The consultant (`admin@gmail.com`) has separate policies granting full read/write access.
