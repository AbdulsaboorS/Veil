---
phase: 01-rebrand
plan: 02
subsystem: ui
tags: [react, localStorage, postMessage, localstorage-migration, rebrand]

# Dependency graph
requires: []
provides:
  - veil-* localStorage key constants in useSessionStore.ts
  - migrateStorageKeys() backwards-compat migration at module load
  - VEIL_SHOW_INFO / VEIL_REQUEST_SHOW_INFO / VEIL_REQUEST_REDETECT postMessage protocol
  - veil-messages-updated CustomEvent name
  - Header wordmark: "veil"
  - System prompt identity: "You are Veil"
affects:
  - extension/sidepanel.js (must use matching VEIL_* postMessage types)
  - Any future plans reading localStorage keys

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Write-first migration: new key written before old key deleted to prevent data loss
    - Module-load migration: migrateStorageKeys() runs before any session reads

key-files:
  created: []
  modified:
    - src/hooks/useSessionStore.ts
    - src/hooks/useInitFlow.ts
    - src/hooks/useChat.ts
    - src/hooks/useEpisodeRecap.ts
    - src/components/Header.tsx
    - src/components/ShieldBadge.tsx
    - src/components/ChatPanel.tsx
    - src/lib/prompts.ts
    - src/lib/types.ts
    - src/pages/Index.tsx
    - src/hooks/useInitFlow.test.ts
    - src/hooks/useSessionStore.test.ts
    - extension/app/assets/index.js

key-decisions:
  - "localStorage migration runs at module load (before readSessions) to guarantee all reads hit new veil-* keys"
  - "Write-first migration strategy: new key written before old deleted — worst case is duplicate data, never data loss"
  - "spoiler-shield-chat Supabase function URL path intentionally NOT renamed (backend rename is separate scope)"
  - "LEGACY_CHAT_KEY stays as spoilershield-chat — it's an already-migrated legacy key, not a brand string"

patterns-established:
  - "Module-level one-shot migration: run at import time, guarded by new-key existence check, wrapped in try/catch"

requirements-completed: [REB-01, REB-03, REB-05]

# Metrics
duration: 8min
completed: 2026-03-20
---

# Phase 1 Plan 2: React src/ Rebrand Summary

**veil-* localStorage keys with backwards-compat migration, VEIL_* postMessage protocol, "veil" wordmark, and "You are Veil" system prompt across all React src/ files**

## Performance

- **Duration:** ~8 min
- **Started:** 2026-03-20T00:12:58Z
- **Completed:** 2026-03-20T00:21:00Z
- **Tasks:** 3
- **Files modified:** 13 (10 src/, 2 test, 1 extension bundle)

## Accomplishments
- localStorage key constants renamed to veil-* with a silent module-load migration that preserves all existing session data
- postMessage protocol updated: VEIL_SHOW_INFO, VEIL_REQUEST_SHOW_INFO, VEIL_REQUEST_REDETECT across useInitFlow.ts
- Custom DOM event renamed: spoilershield-messages-updated → veil-messages-updated in useInitFlow.ts and useChat.ts
- Header wordmark "spoilershield" → "veil" in both side panel and web app variants
- ShieldBadge label "Spoiler Shield:" → "Veil:", system prompt identity "You are Veil"
- Test files updated to use veil-* keys and VEIL_SHOW_INFO message type
- Extension bundle rebuilt to pick up all src/ changes

## Task Commits

Each task was committed atomically:

1. **Task 1: Rename localStorage key constants + add migration in useSessionStore.ts** - `679fae5` (feat)
2. **Task 2: Rename postMessage types, custom event, and constants in useInitFlow.ts** - `a737aac` (feat)
3. **Task 3: Rename UI strings, event listener, and remaining src/ references** - `b852972` (feat)
4. **Extension bundle rebuild** - `a225719` (chore)

## Files Created/Modified
- `src/hooks/useSessionStore.ts` - veil-* key constants + migrateStorageKeys() migration function
- `src/hooks/useInitFlow.ts` - VEIL_* postMessage types, veil-messages-updated event, veil-* local constants
- `src/hooks/useChat.ts` - veil-messages-updated event listener, [Veil] console prefix, veil-chat default key
- `src/hooks/useEpisodeRecap.ts` - [Veil] console prefix
- `src/components/Header.tsx` - "veil" wordmark in side panel and web app headers
- `src/components/ShieldBadge.tsx` - "Veil:" label text
- `src/components/ChatPanel.tsx` - veil-reports localStorage key, "Veil will tighten" toast
- `src/lib/prompts.ts` - "You are Veil," system prompt identity
- `src/lib/types.ts` - Updated InitPhase comment to reference VEIL_SHOW_INFO
- `src/pages/Index.tsx` - veil-setup localStorage key
- `src/hooks/useInitFlow.test.ts` - VEIL_SHOW_INFO message type, veil-sessions/veil-msgs- keys
- `src/hooks/useSessionStore.test.ts` - veil-* test constants, updated test description
- `extension/app/assets/index.js` - Extension bundle rebuilt

## Decisions Made
- Kept `spoiler-shield-chat` Supabase function URL path unchanged — backend rename is separate scope from this plan
- LEGACY_CHAT_KEY (`spoilershield-chat`) intentionally preserved — it's an existing legacy migration key, not a brand string
- Migration runs at module load time so every subsequent localStorage read in the session hits new veil-* keys
- Write-first migration strategy (write new, then delete old) prevents any data loss even if migration is interrupted

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing Critical] Updated types.ts comment and ChatPanel.tsx toast text**
- **Found during:** Task 3 verification grep scan
- **Issue:** types.ts had `// waiting for SPOILERSHIELD_SHOW_INFO` comment; ChatPanel.tsx had "Spoiler shield will tighten" toast (user-visible brand reference)
- **Fix:** Updated comment to VEIL_SHOW_INFO; updated toast to "Veil will tighten"
- **Files modified:** src/lib/types.ts, src/components/ChatPanel.tsx
- **Verification:** Final grep found no remaining SPOILERSHIELD brand strings in non-migration code
- **Committed in:** b852972 (Task 3 commit)

---

**Total deviations:** 1 auto-fixed (Rule 2 — missing critical references caught by post-edit grep scan)
**Impact on plan:** Small additions within Task 3 scope. No scope creep.

## Issues Encountered
None — plan executed without blocking issues. Build succeeded on first attempt.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- React src/ rebrand complete. All veil-* keys, VEIL_* postMessage types, and UI strings updated.
- Extension bundle rebuilt and ready for testing.
- Prerequisite for plan 01-01 (extension scripts) to align on the same VEIL_* postMessage protocol.
- Smoke test checklist items 3-5, 9 should be verified after extension scripts update (plan 01-01).

---
*Phase: 01-rebrand*
*Completed: 2026-03-20*
