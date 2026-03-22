---
phase: 03-feedback-and-testing
plan: "00"
subsystem: testing
tags: [vitest, testing-library, jsdom, tdd]

# Dependency graph
requires:
  - phase: 02-subtitle-context
    provides: subtitle pipeline complete; codebase stable for test layer

provides:
  - vitest binary installed with jsdom environment
  - Failing test stubs for FBK-01 (FeedbackDialog component)
  - Failing test stubs for FBK-02 (submitFeedback utility)
  - Passing test stubs for FBK-03 (admin password gate sha256 logic)

affects: [03-01, 03-02, 03-03]

# Tech tracking
tech-stack:
  added: [vitest, @testing-library/react, @testing-library/user-event, jsdom]
  patterns: [TDD RED/GREEN cycle — stubs written before implementation]

key-files:
  created:
    - src/test/FeedbackDialog.test.tsx
    - src/test/submitFeedback.test.ts
    - src/test/AdminPage.test.tsx
  modified:
    - package.json
    - package-lock.json

key-decisions:
  - "AdminPage password gate tested as pure sha256 function — Next.js page itself stays in manual verification"
  - "vitest + @testing-library/react chosen (config pre-existed, binary absent — install only)"
  - "FBK-03 stubs pass immediately (Web Crypto available in jsdom) — gives a passing baseline before any implementation"

patterns-established:
  - "Test stubs import not-yet-existing modules to enforce RED state before implementation"
  - "AdminPage logic extracted to pure function for unit testability, page rendering stays as manual smoke test"

requirements-completed: [FBK-01, FBK-02, FBK-03]

# Metrics
duration: 5min
completed: 2026-03-22
---

# Phase 3 Plan 00: Vitest Setup and Failing Test Stubs Summary

**Vitest installed and three test stubs created: FeedbackDialog and submitFeedback are RED (modules absent), AdminPage sha256 gate is GREEN — TDD baseline established for Phase 3**

## Performance

- **Duration:** ~5 min
- **Started:** 2026-03-22T06:39:40Z
- **Completed:** 2026-03-22T06:44:00Z
- **Tasks:** 1
- **Files modified:** 5 (3 new test files + package.json + package-lock.json)

## Accomplishments
- Installed vitest, @testing-library/react, @testing-library/user-event, jsdom into devDependencies
- Created `FeedbackDialog.test.tsx` with 3 stubs for FBK-01 (render trigger, open dialog, show textarea)
- Created `submitFeedback.test.ts` with 2 stubs for FBK-02 (POST to log-feedback, payload shape)
- Created `AdminPage.test.tsx` with 3 passing stubs for FBK-03 (sha256 determinism, idempotency, uniqueness)
- Confirmed RED/GREEN state: FBK-01/02 fail on import, FBK-03 all pass

## Task Commits

1. **Task 1: Install vitest and create failing test stubs** - `03f5d94` (test)

**Plan metadata:** (pending docs commit)

## Files Created/Modified
- `src/test/FeedbackDialog.test.tsx` - FBK-01 stubs: trigger button, dialog open, textarea visible
- `src/test/submitFeedback.test.ts` - FBK-02 stubs: POST URL contains "log-feedback", body shape matches
- `src/test/AdminPage.test.tsx` - FBK-03 stubs: sha256 determinism using Web Crypto API
- `package.json` - Added vitest, @testing-library/react, @testing-library/user-event, jsdom as devDependencies
- `package-lock.json` - Lock file updated (92 packages added)

## Decisions Made
- AdminPage password gate tested as a pure sha256 function — the Next.js admin page itself is in `landing/` and not bundled by Vite/Vitest; manual verification (03-VALIDATION.md) covers the full page
- FBK-03 stubs use Web Crypto which is natively available in jsdom — no mocking needed, gives an immediate GREEN baseline
- vitest config (`vitest.config.ts`) and setup file (`src/test/setup.ts`) were already present; only the binary was missing

## Deviations from Plan
None - plan executed exactly as written.

## Issues Encountered
None. The pre-existing `vitest.config.ts` and `src/test/setup.ts` meant zero configuration work was needed — just install and write files.

## Self-Check

Files exist:
- `src/test/FeedbackDialog.test.tsx` - FOUND
- `src/test/submitFeedback.test.ts` - FOUND
- `src/test/AdminPage.test.tsx` - FOUND

Commit exists:
- `03f5d94` - FOUND (test(03-00): install vitest and create failing test stubs for FBK-01/02/03)

## Self-Check: PASSED

## Next Phase Readiness
- Plan 03-01 (FeedbackDialog component) can begin — FBK-01 stubs are RED and awaiting implementation
- Plan 03-02 (submitFeedback utility + log-feedback edge function) can begin — FBK-02 stubs are RED
- Plan 03-03 (AdminPage) deferred to manual verification per decision above

---
*Phase: 03-feedback-and-testing*
*Completed: 2026-03-22*
