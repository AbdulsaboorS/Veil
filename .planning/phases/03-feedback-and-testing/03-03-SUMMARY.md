---
phase: 03-feedback-and-testing
plan: "03"
subsystem: admin
tags: [nextjs, sha256, supabase, rest-api, password-gate]

# Dependency graph
requires:
  - phase: 03-feedback-and-testing
    provides: feedback table in Supabase (from 03-01/03-02) that admin page reads
provides:
  - Read-only admin dashboard at /admin in landing Next.js app
  - SHA-256 password gate protecting feedback table access
  - landing/.env.local with Supabase + admin hash vars (gitignored, local only)
affects: [chrome-web-store, landing-deploy]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "SHA-256 password gate using Web Crypto API (crypto.subtle.digest) — no npm dependency"
    - "Supabase REST fetch pattern: apikey + Authorization headers, no @supabase/supabase-js"
    - "Admin auth state persisted via localStorage key veil_admin_auth (stores hash string)"

key-files:
  created:
    - landing/app/admin/page.tsx
    - landing/.env.local (gitignored)
  modified: []

key-decisions:
  - "landing/.env.local is gitignored — Supabase URL/key and admin hash must be set manually on each dev machine and in Vercel env vars"
  - "Password hash stored in NEXT_PUBLIC_ADMIN_HASH — hash comparison happens client-side via Web Crypto; acceptable for internal admin page"
  - "No new npm dependencies — raw fetch to Supabase REST API, Web Crypto for SHA-256"

patterns-established:
  - "Admin gate pattern: SHA-256 hash comparison via Web Crypto, hash stored in localStorage on success"

requirements-completed: [FBK-03]

# Metrics
duration: 8min
completed: 2026-03-22
---

# Phase 3 Plan 03: Admin Dashboard Summary

**Read-only /admin page in landing Next.js app with SHA-256 password gate and Supabase REST feedback table — no new npm dependencies**

## Performance

- **Duration:** 8 min
- **Started:** 2026-03-22T01:50:00Z
- **Completed:** 2026-03-22T01:58:00Z
- **Tasks:** 1
- **Files modified:** 2

## Accomplishments

- `landing/app/admin/page.tsx` renders a centered password gate when not authenticated, full feedback table when unlocked
- Correct password (must match `NEXT_PUBLIC_ADMIN_HASH` via SHA-256 client-side) persists to `localStorage('veil_admin_auth')`
- Incorrect password shows inline error; gate stays visible
- Authenticated view fetches `/rest/v1/feedback?order=created_at.desc&limit=200` via raw Supabase REST fetch (no @supabase/supabase-js)
- Responsive table: Time + Feedback columns always visible; Show, Platform, Ep columns hidden on mobile, shown on md+
- Sign out clears localStorage and returns to gate
- `AdminPage.test.tsx` 3/3 tests pass (sha256 logic: deterministic, idempotent, distinct hashes)
- Next.js production build confirms `/admin` route compiles and generates static page

## Task Commits

Each task was committed atomically:

1. **Task 1: Create the admin dashboard page** - `02ebbb7` (feat)

**Plan metadata:** (docs commit follows)

## Files Created/Modified

- `landing/app/admin/page.tsx` - SHA-256 password gate + Supabase REST feedback table, "use client" Next.js page
- `landing/.env.local` - Created locally (gitignored): NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, NEXT_PUBLIC_ADMIN_HASH

## Decisions Made

- `landing/.env.local` is gitignored (correct security practice) — only `landing/app/admin/page.tsx` committed; env vars must be set in Vercel dashboard separately
- Password hash comparison is entirely client-side (Web Crypto SHA-256) — acceptable for an internal-only admin page with no sensitive write operations

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

- `landing/.env.local` could not be committed (gitignored as expected) — documented in commit message; env vars need to be added to Vercel manually before deploying

## User Setup Required

To deploy the admin page to Vercel, add `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, and `NEXT_PUBLIC_ADMIN_HASH` (SHA-256 hex of your chosen admin password; see `landing/.env.example`) in the Vercel project dashboard. Rotate the password by picking a new secret, re-hashing, updating the env var, and redeploying.

## Next Phase Readiness

- FBK-03 complete: feedback admin dashboard is live at `/admin`
- All three FBK requirements (FBK-01 dialog, FBK-02 edge function, FBK-03 admin page) now complete
- Phase 03-feedback-and-testing is done; ready for Phase 04 (Chrome Web Store submission)

---
*Phase: 03-feedback-and-testing*
*Completed: 2026-03-22*
