---
phase: 03-feedback-and-testing
plan: "01"
subsystem: ui
tags: [react, radix-ui, lucide, sonner, vitest, testing-library]

# Dependency graph
requires:
  - phase: 03-feedback-and-testing
    provides: log-feedback Supabase edge function deployed (03-00)

provides:
  - FeedbackDialog component (trigger button + Radix Dialog form + submission logic)
  - submitFeedback utility (POSTs text+meta to log-feedback edge function)
  - Header side-panel branch wired to render FeedbackDialog with session meta
  - Extension bundle rebuilt with feedback button

affects:
  - 03-02-PLAN.md (log-feedback edge function implementation — client-side payload is now fixed)

# Tech tracking
tech-stack:
  added:
    - "@testing-library/jest-dom ^6.9.1 — provides toBeInTheDocument and other DOM matchers in vitest"
  patterns:
    - "Ghost icon button pattern (h-7 w-7 p-0) consistent with history button in Header"
    - "submitFeedback utility: standalone async function, throws on non-ok so callers catch cleanly"
    - "FeedbackDialog: local state (open, text, isSubmitting), no global state required"
    - "Feedback button rendered unconditionally in side-panel header (visible in all phases)"

key-files:
  created:
    - src/lib/submitFeedback.ts
    - src/components/FeedbackDialog.tsx
  modified:
    - src/components/Header.tsx
    - src/test/setup.ts
    - extension/app/assets/index.js

key-decisions:
  - "FeedbackDialog rendered unconditionally in side-panel branch (not gated on statusBadgeProps) — always visible per FBK-01"
  - "@testing-library/jest-dom installed as auto-fix to unblock test assertions (Rule 3)"
  - "Pre-existing test failures in useInitFlow.test.ts and useSessionStore.test.ts logged to deferred-items.md — out of scope for this plan"

patterns-established:
  - "Ghost button + Radix Dialog pattern for header actions alongside history button"
  - "submitFeedback as thin fetch wrapper — error thrown, caller handles toast"

requirements-completed: [FBK-01, FBK-02]

# Metrics
duration: 5min
completed: 2026-03-22
---

# Phase 03 Plan 01: FeedbackDialog and submitFeedback Summary

**Feedback button wired into side-panel header using Radix Dialog + MessageSquare icon, POSTing trimmed text and session metadata to the log-feedback edge function via a standalone submitFeedback utility.**

## Performance

- **Duration:** ~5 min
- **Started:** 2026-03-22T06:42:47Z
- **Completed:** 2026-03-22T06:47:00Z
- **Tasks:** 2
- **Files modified:** 5

## Accomplishments

- `src/lib/submitFeedback.ts` — async utility POSTing `{text, showTitle, platform, season, episode}` to log-feedback with Bearer auth header; throws on non-ok for clean caller error handling
- `src/components/FeedbackDialog.tsx` — ghost icon trigger button (MessageSquare, h-7 w-7) + Radix Dialog with textarea + Send button; handles submitting state, success/error toasts, dialog close on success
- `src/components/Header.tsx` — FeedbackDialog imported and rendered between StatusBadge and history button in the side-panel branch; visible in all init phases
- Extension bundle rebuilt and confirmed to contain "Send feedback" aria-label text

## Task Commits

Each task was committed atomically:

1. **Task 1: Create submitFeedback utility and FeedbackDialog component** - `fb4b07c` (feat)
2. **Task 2: Wire FeedbackDialog into Header and rebuild extension bundle** - `c88dc41` (feat)

## Files Created/Modified

- `src/lib/submitFeedback.ts` — POSTs feedback payload to log-feedback edge function
- `src/components/FeedbackDialog.tsx` — Radix Dialog with trigger button and submission form
- `src/components/Header.tsx` — FeedbackDialog added to side-panel right icon row
- `src/test/setup.ts` — Added `@testing-library/jest-dom` import (auto-fix)
- `extension/app/assets/index.js` — Rebuilt bundle containing FeedbackDialog

## Decisions Made

- FeedbackDialog rendered unconditionally in side-panel branch (not gated on `statusBadgeProps` being defined), ensuring the button is visible in every init phase including `detecting` and `no-show`.
- `@testing-library/jest-dom` installed to unblock `toBeInTheDocument` assertions in FeedbackDialog tests (Rule 3 auto-fix).
- Pre-existing failures in `useInitFlow.test.ts` (infinite timer loop) and one `useSessionStore.test.ts` test logged to `deferred-items.md` — not caused by this plan's changes, out of scope.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Installed missing @testing-library/jest-dom**
- **Found during:** Task 1 (TDD GREEN phase — running FeedbackDialog tests)
- **Issue:** Tests used `toBeInTheDocument()` but `@testing-library/jest-dom` was not installed; Vitest reported "Invalid Chai property: toBeInTheDocument"
- **Fix:** `npm install --save-dev @testing-library/jest-dom`; added `import '@testing-library/jest-dom'` to `src/test/setup.ts`
- **Files modified:** package.json, package-lock.json, src/test/setup.ts
- **Verification:** All 5 FeedbackDialog + submitFeedback tests pass GREEN
- **Committed in:** `fb4b07c` (Task 1 commit)

---

**Total deviations:** 1 auto-fixed (1 blocking dependency)
**Impact on plan:** Necessary fix to enable test execution. No scope creep.

## Issues Encountered

Pre-existing test failures in `useInitFlow.test.ts` (17 tests fail due to `setInterval` infinite loop in jsdom) and `useSessionStore.test.ts` (1 test — session eviction returning `'[]'` instead of `null`). Both were pre-existing and unrelated to this plan. Documented in `deferred-items.md`.

## User Setup Required

None — no external service configuration required. The log-feedback edge function was deployed in plan 03-00.

## Next Phase Readiness

- FBK-01 complete: feedback entry point visible at all times in side-panel
- FBK-02 client side complete: correct payload shape submitted
- Ready for 03-02: log-feedback edge function implementation (server side of FBK-02)
- Extension bundle is current — no manual rebuild needed before testing in Chrome

---
*Phase: 03-feedback-and-testing*
*Completed: 2026-03-22*
