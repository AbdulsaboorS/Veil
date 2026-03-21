---
phase: 02-subtitle-context
plan: "03"
subsystem: extension
tags: [crunchyroll, subtitles, fetch-interception, ass-parser, main-world, content-script]
dependency_graph:
  requires: [02-01, 02-02]
  provides: [crunchyroll-subtitle-capture]
  affects: [extension/content.js, extension/manifest.json, extension/subtitle-interceptor.js]
tech_stack:
  added: []
  patterns: [MAIN-world-content-script, fetch-override, postMessage-bridge, setInterval-poll]
key_files:
  created:
    - extension/subtitle-interceptor.js
  modified:
    - extension/manifest.json
    - extension/content.js
    - extension/app/assets/index.js
decisions:
  - "MAIN world fetch override chosen over DOM MutationObserver — Crunchyroll's current player DOM has no reliable subtitle element selectors; ASS file fetch is the only reliable signal"
  - "response.clone() pattern used — consuming the original fetch response would break the Crunchyroll player"
  - "isPreferredLanguage() rejects ja/ko/zh/ar/pt/es/de/fr/it/ru and signs tracks — English-only acceptance is conservative; unknown locale URLs are accepted"
  - "pickSubtitleElements() returns [] early for Crunchyroll — eliminates wasted MutationObserver rescans with zero-match selectors"
  - "1s poll interval chosen — balances subtitle freshness against unnecessary chrome.storage writes; subtitles typically 2-5s each"
  - "findMainVideo() picks longest-duration video element — avoids writing ad subtitle cues to veil_context"
metrics:
  duration: "~2 minutes"
  completed: "2026-03-21T07:44:31Z"
  tasks_completed: 3
  files_created: 1
  files_modified: 3
---

# Phase 02 Plan 03: Crunchyroll Subtitle Network Interception Summary

**One-liner:** Crunchyroll ASS subtitle capture via MAIN world fetch override — intercepts the subtitle file fetch, parses all cues with timestamps, and polls video.currentTime every 1s to write active lines to chrome.storage.local['veil_context'].

## What Was Built

Three files changed to implement the complete Crunchyroll subtitle interception pipeline:

**extension/subtitle-interceptor.js (new):** A MAIN world content script that overrides `window.fetch` before the Crunchyroll player initializes. When an `.ass` subtitle file fetch is detected (via URL pattern matching), it clones the response (preserving the original for the player), parses all `Dialogue:` lines using a full ASS timestamp parser, and posts the cue list to the isolated world via `window.postMessage({ type: '__VEIL_SUBTITLE_INTERCEPTED__', cues })`.

**extension/manifest.json:** Added a second `content_scripts` entry as the first array element — `subtitle-interceptor.js` with `world: "MAIN"`, `run_at: "document_start"`, scoped to `/watch/*` URLs only. The existing `content.js` entry is unchanged.

**extension/content.js:** Two additions:
1. `pickSubtitleElements()` now returns `[]` immediately for Crunchyroll — eliminates wasted MutationObserver rescans against DOM selectors that never match.
2. An IIFE at the bottom that listens for `__VEIL_SUBTITLE_INTERCEPTED__` messages, then runs `startSyncLoop(cues)` — a `setInterval` at 1000ms that queries `video.currentTime`, finds active cues by timestamp range, and writes up to 5 lines to `chrome.storage.local['veil_context']` in the shape sidepanel.js already expects.

## Full Pipeline (Now Complete)

```
Crunchyroll player fetch .ass file
  → subtitle-interceptor.js (MAIN world) intercepts fetch
  → parseASS() extracts cues with start/end seconds + clean text
  → window.postMessage { type: '__VEIL_SUBTITLE_INTERCEPTED__', cues }
  → content.js (isolated world) receives message
  → startSyncLoop(cues): setInterval 1s
  → findActiveCues(cues, video.currentTime) → up to 5 active lines
  → chrome.storage.local.set({ veil_context: { platform, lines, contextText, ... } })
  → sidepanel.js chrome.storage.onChanged → sendContextToApp → VEIL_CONTEXT postMessage
  → useInitFlow.ts VEIL_CONTEXT listener → session.context updated
  → Gemini prompt includes current subtitle context
```

## Deviations from Plan

None — plan executed exactly as written.

## Commits

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Create subtitle-interceptor.js | 46fd98c | extension/subtitle-interceptor.js |
| 2 | Update manifest.json + content.js listener | 25d3bc4 | extension/manifest.json, extension/content.js |
| 3 | Disable DOM scan + rebuild bundle | 5b9482f | extension/content.js, extension/app/assets/index.js |

## Verification Results

- `test -f extension/subtitle-interceptor.js` → exists
- `grep -c "world" extension/manifest.json` → 1
- `grep -c "__VEIL_SUBTITLE_INTERCEPTED__" extension/content.js` → 1
- manifest structural check: 2 entries, first is subtitle-interceptor.js with MAIN/document_start/watch-only
- ASS parser sanity: `{an8}Hello world` → "Hello world" (override tag stripped), "Goodbye" → "Goodbye" — PASS
- `BUILD_TARGET=extension npm run build` → exits 0, 427.52 kB bundle

## Self-Check: PASSED

Files verified:
- FOUND: extension/subtitle-interceptor.js
- FOUND: extension/manifest.json (2 content_scripts entries, world: MAIN confirmed)
- FOUND: extension/content.js (pickSubtitleElements early return + __VEIL_SUBTITLE_INTERCEPTED__ listener)
- FOUND: extension/app/assets/index.js (rebuilt, committed)

Commits verified:
- FOUND: 46fd98c feat(02-03): create subtitle-interceptor.js MAIN world fetch override
- FOUND: 25d3bc4 feat(02-03): wire subtitle-interceptor.js into manifest; add postMessage receiver to content.js
- FOUND: 5b9482f feat(02-03): disable Crunchyroll DOM subtitle scan; rebuild extension bundle
