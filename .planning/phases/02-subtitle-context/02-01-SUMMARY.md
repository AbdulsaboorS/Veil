---
phase: 02-subtitle-context
plan: 01
subsystem: ui
tags: [react, postmessage, chrome-extension, context, subtitles]

# Dependency graph
requires:
  - phase: 01-rebrand
    provides: Renamed extension storage keys (veil_show_info, veil_context) in content.js and sidepanel.js
provides:
  - VEIL_CONTEXT postMessage listener in useInitFlow.ts with 3s debounce and context merge
  - Subtitle lines from sidepanel.js now flow into active session's context field
  - CURRENT SCENE block appended to session context, replacing any prior CURRENT SCENE block
affects:
  - 02-subtitle-context (02-02 human-verify plan)
  - spoiler-shield-chat edge function receives subtitle context via the session context field

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Separate useEffect per message type — VEIL_SHOW_INFO and VEIL_CONTEXT each have their own independent listener"
    - "Latest-ref pattern for sessionStoreRef — stale closure avoided by reading ref at debounce execution time"
    - "Debounce at 3s on high-frequency DOM events before writing to localStorage"
    - "Regex-based CURRENT SCENE replacement preserves recap summary verbatim"

key-files:
  created: []
  modified:
    - src/hooks/useInitFlow.ts
    - extension/app/assets/index.js

key-decisions:
  - "Only last 5 subtitle lines stored as positional hint — full transcript would be scope creep and token waste"
  - "VEIL_CONTEXT listener is a standalone useEffect, never touches setPhase, lastProcessedKeyRef, or hasReceivedShowInfo"
  - "3-second debounce chosen to match subtitle DOM mutation frequency (~1-2s intervals) while staying responsive"
  - "sessionId read at debounce execution time (not scheduling time) to guarantee latest active session"

patterns-established:
  - "One useEffect per postMessage type — never merge handlers into a single listener with type branching for unrelated concerns"
  - "Always pass explicitSessionId to updateContext — never rely on activeSessionIdRef fallback"

requirements-completed: [SUB-01, SUB-02, SUB-03]

# Metrics
duration: 1min
completed: 2026-03-21
---

# Phase 2 Plan 01: Subtitle Context Wire-up Summary

**VEIL_CONTEXT postMessage listener added to useInitFlow.ts — subtitle lines now merge into active session context as a CURRENT SCENE block with 3-second debounce, closing the capture-to-chat pipeline gap**

## Performance

- **Duration:** ~1 min
- **Started:** 2026-03-21T06:38:12Z
- **Completed:** 2026-03-21T06:39:07Z
- **Tasks:** 1
- **Files modified:** 2

## Accomplishments
- Added standalone VEIL_CONTEXT useEffect in useInitFlow.ts that never touches detection phase state
- Added contextDebounceRef to manage 3-second debounce timer with proper cleanup
- Last 5 subtitle lines merged into active session context as `CURRENT SCENE:` block
- Previous `CURRENT SCENE:` block replaced on each update; recap summary preserved verbatim
- Extension bundle rebuilt and compiled VEIL_CONTEXT listener into extension/app/assets/index.js

## Task Commits

Each task was committed atomically:

1. **Task 1: Add VEIL_CONTEXT listener with debounce and context merge** - `69d235f` (feat)

## Files Created/Modified
- `src/hooks/useInitFlow.ts` - added contextDebounceRef and VEIL_CONTEXT useEffect (separate from VEIL_SHOW_INFO handler)
- `extension/app/assets/index.js` - rebuilt bundle containing the new listener

## Decisions Made
- Used last 5 subtitle lines only (not full buffer of 40) — positional hint, not transcript; avoids token cost
- sessionId read inside setTimeout callback (at execution time), not at scheduling time — prevents stale closure where session switches between scheduling and firing
- CURRENT SCENE regex (`/\nCURRENT SCENE:[\s\S]*$/`) replaces entire trailing block so stale lines never accumulate

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- VEIL_CONTEXT listener is live in the extension bundle
- End-to-end subtitle context flow is complete: content.js captures lines → chrome.storage → sidepanel.js postMessage → useInitFlow.ts listener → sessionStore.updateContext → watchSetup.context → spoiler-shield-chat Gemini prompt
- Plan 02-02 (human-verify) covers manual confirmation that subtitle text appears in the chat context during a live session

---
*Phase: 02-subtitle-context*
*Completed: 2026-03-21*
