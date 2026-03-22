---
phase: 03-feedback-and-testing
plan: "02"
subsystem: database
tags: [supabase, edge-functions, deno, postgres, rls]

# Dependency graph
requires:
  - phase: 03-feedback-and-testing
    provides: FBK-01 FeedbackDialog component (client-side feedback UI)
provides:
  - feedback table in Supabase (DDL + RLS) accepting user text + show metadata
  - log-feedback edge function deployed to dbileyqtnisyqzgwwive; POST inserts row, validates empty text
affects:
  - 03-03-PLAN (client wiring: FeedbackDialog calls /functions/v1/log-feedback)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Supabase edge function with verify_jwt=false for unauthenticated client calls"
    - "Service role key for DB writes bypasses RLS; anon key still used for reads"
    - "Migration file naming: YYYYMMDD000001_create_<table>.sql"

key-files:
  created:
    - supabase/migrations/20260322000001_create_feedback.sql
    - supabase/functions/log-feedback/index.ts
  modified:
    - supabase/config.toml
    - CLAUDE.md

key-decisions:
  - "verify_jwt=false added to config.toml for log-feedback — Chrome extension uses sb_publishable_ key, not a JWT; endpoint must accept unauthenticated POSTs"
  - "text capped at 2000 chars server-side to bound row size"

patterns-established:
  - "New edge functions must be added to supabase/config.toml with verify_jwt=false to accept requests from extension"

requirements-completed: [FBK-02]

# Metrics
duration: 2min
completed: 2026-03-22
---

# Phase 3 Plan 02: Feedback Table and log-feedback Edge Function Summary

**`feedback` Supabase table (7-column DDL + RLS) and `log-feedback` edge function deployed — valid POSTs return `{ok:true}`, empty text returns HTTP 400**

## Performance

- **Duration:** ~2 min
- **Started:** 2026-03-22T06:46:33Z
- **Completed:** 2026-03-22T06:48:30Z
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments

- `feedback` table created in Supabase (bigserial id, text NOT NULL, show_title, platform, season, episode, created_at) with `created_at desc` index and RLS anon-read policy
- Migration applied to remote project `dbileyqtnisyqzgwwive` via `supabase db push`
- `log-feedback` edge function deployed and ACTIVE — validates payload, inserts via service_role, returns `{ok:true}` or 400
- `config.toml` updated with `verify_jwt=false` so extension (using `sb_publishable_*` key, not JWT) can call the function without auth errors

## Task Commits

Each task was committed atomically:

1. **Task 1: Create feedback table migration** - `9cf8ca4` (feat)
2. **Task 2: Create and deploy log-feedback edge function** - `5a214d9` (feat)

**Plan metadata:** (docs commit follows)

## Files Created/Modified

- `supabase/migrations/20260322000001_create_feedback.sql` - feedback table DDL with RLS
- `supabase/functions/log-feedback/index.ts` - edge function: validate, insert, respond
- `supabase/config.toml` - added `[functions."log-feedback"] verify_jwt = false`
- `CLAUDE.md` - Section 10 Quick Commands: added `supabase functions deploy log-feedback`

## Decisions Made

- `verify_jwt = false` required in `config.toml`: the Chrome extension uses `sb_publishable_*` key format (not a JWT), so any deployed edge function without this flag will reject all extension calls with HTTP 401.
- Text is capped at 2000 chars server-side to bound row size without requiring client enforcement.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing Critical] Added verify_jwt=false to config.toml**
- **Found during:** Task 2 (deploy + smoke test)
- **Issue:** Smoke test returned HTTP 401 "Invalid Token or Protected Header formatting" — the publishable key is not a JWT; default Supabase function JWT verification rejected it
- **Fix:** Added `[functions."log-feedback"] verify_jwt = false` to `supabase/config.toml` and redeployed
- **Files modified:** `supabase/config.toml`
- **Verification:** Smoke test returned `{"ok":true}`; empty-text test returned HTTP 400
- **Committed in:** `5a214d9` (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (1 missing critical)
**Impact on plan:** Auto-fix essential — without it the function is unreachable from the extension. No scope creep.

## Issues Encountered

- Migration history mismatch (`supabase db push` failed on first try). Resolved with `supabase migration repair --status reverted 20260321230227` then re-ran push. Both `20260321000001_create_subtitle_cues.sql` and the new migration applied cleanly.

## User Setup Required

None - migration is applied, function is deployed, no environment variables needed beyond existing `SUPABASE_SERVICE_ROLE_KEY` secret already set in Supabase project.

## Next Phase Readiness

- Backend is fully ready for plan 03-03: FeedbackDialog client wiring
- POST `https://dbileyqtnisyqzgwwive.supabase.co/functions/v1/log-feedback` accepts `{text, showTitle, platform, season, episode}` and returns `{ok:true}`
- Feedback rows are visible in Supabase Studio table editor under `feedback`

---
*Phase: 03-feedback-and-testing*
*Completed: 2026-03-22*
