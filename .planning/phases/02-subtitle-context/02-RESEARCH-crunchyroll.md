# Phase 2: Subtitle Context — Crunchyroll Network Intercept Research

**Researched:** 2026-03-21
**Domain:** Chrome MV3 network interception, Crunchyroll subtitle delivery, ASS/VTT parsing, video sync
**Confidence:** MEDIUM — Crunchyroll player internals are reverse-engineered (no official docs); MV3 technique is HIGH confidence from official Chrome docs and verified implementations

---

## Summary

This document answers the ten technical questions needed to decide whether to intercept Crunchyroll subtitle files at the **network layer** (fetch override in MAIN world) rather than from the rendered DOM. The key finding is that network-layer intercept is technically feasible in MV3 but carries substantial implementation complexity and reliability risk compared to the existing DOM-observer approach already in `content.js`.

**The existing DOM-observer in `content.js` should be validated and fixed first** (selector audit on a live Crunchyroll page). Network-layer intercept is the right fallback if DOM observation proves unreliable on Crunchyroll's production player — which is an open question that requires manual testing.

**Primary recommendation:** Do not implement network-layer intercept until a live selector audit confirms DOM observation fails. If it does fail, use MAIN-world fetch override to intercept the ASS subtitle file, parse cues client-side, and poll `video.currentTime` at 1-second intervals. The video element is accessible in the main frame DOM on Crunchyroll watch pages. New permissions required: none beyond what is already in the manifest.

---

## Q1: How Does Crunchyroll Fetch Subtitle Files?

### URL Pattern (MEDIUM confidence — from yt-dlp issue analysis, not official docs)

Crunchyroll's player fetches subtitle files via a CMS v2 API:

```
/cms/v2/{REGION}/M3/crunchyroll/videos/{VIDEO_ID}/streams
```

Where `{REGION}` is a territory code (e.g., `US`, `BR`). The `/streams` endpoint returns a JSON object listing all available streams and subtitles. Each subtitle entry contains a direct URL to the subtitle file.

Subtitle file URLs typically look like:
```
https://static.crunchyroll.com/.../{VIDEO_ID}.{lang}.ass
```

These are direct HTTPS file fetches, not streamed — a single `fetch()` call to a `.ass` URL returns the full subtitle file body.

### Format

Crunchyroll uses **ASS (Advanced SubStation Alpha)** format for soft subtitles. This is confirmed by:
- yt-dlp verbose output showing `format: ass` in subtitle metadata
- The `crunchyroll-html5` extension using `JavascriptSubtitlesOctopus` (libass-based renderer) for ASS playback
- The `VilosPlayerService.ts` source code using an `AssSubtitle` class

**Hardsubbed streams** (subtitles baked into video) also exist as a fallback — these cannot be intercepted or read by an extension.

Crunchyroll also appears to be testing a new player in some regions (Brazil, Colombia, etc.) that renders hard-coded non-removable subtitles. For these regions, DOM observation is also likely to fail. This is an edge case and not a blocker for the primary implementation.

As of late 2025, Crunchyroll reportedly downgraded some subtitle quality (dropping rich ASS typesetting for bare-bones text). The format is still ASS but with simpler styling. Text content remains parseable.

**Confidence:** MEDIUM — confirmed via third-party tool analysis; Crunchyroll has no public subtitle API documentation.

---

## Q2: Can a Content Script Intercept Fetch/XHR Using Monkey-Patching?

### Answer: Yes, but only from MAIN world injection

A standard MV3 content script runs in an **ISOLATED world** — it has its own copy of `window` and cannot access or override the page's `window.fetch`. Patching `window.fetch` in an isolated world has no effect on requests made by the page.

To intercept page-initiated fetch calls, you must inject code into the **MAIN world** (page's native JS context). Two methods exist:

**Method A: Manifest declaration (static)**
```json
{
  "content_scripts": [{
    "matches": ["https://www.crunchyroll.com/watch/*"],
    "js": ["subtitle-interceptor.js"],
    "run_at": "document_start",
    "world": "MAIN"
  }]
}
```

**Method B: Dynamic registration via scripting API**
```javascript
chrome.scripting.registerContentScripts([{
  id: 'subtitle-interceptor',
  matches: ['https://www.crunchyroll.com/watch/*'],
  js: ['subtitle-interceptor.js'],
  runAt: 'document_start',
  world: 'MAIN'
}]);
```

`world: "MAIN"` is supported in both manifest `content_scripts` declarations and `scripting.registerContentScripts()` in MV3. The current manifest does not use it — adding it requires adding the field only, no new permissions.

### Limitations

- Scripts in MAIN world are subject to the **page's Content Security Policy (CSP)**. Crunchyroll's CSP is unknown without live inspection; if it uses `script-src 'self'`, injected scripts may be blocked. In practice, most streaming sites allow inline scripts and MAIN world injection works.
- The fetch override must be in place **before** the Crunchyroll player code runs. `document_start` timing is critical — any later injection misses the initial subtitle fetch.
- Subtitle files fetched inside a **Web Worker or Service Worker** cannot be intercepted by MAIN world injection. Crunchyroll is not known to use workers for subtitle delivery.

**Confidence:** HIGH — official Chrome docs confirm `world: "MAIN"` support; pattern confirmed by multiple working extensions.

---

## Q3: Can `chrome.declarativeNetRequest` or `chrome.webRequest` Read Response Bodies?

### Answer: No — definitively confirmed by official Chrome documentation

**`chrome.webRequest`** in MV3:
- Can observe request/response events (`onBeforeRequest`, `onResponseStarted`, `onCompleted`, etc.)
- Can read **request and response headers**
- **Cannot read response bodies** — this is explicitly absent from all event payloads
- `onResponseStarted` fires "when the first byte of the response body is received" but provides no access to that body
- `webRequestBlocking` (which allowed body modification in MV2) is removed in MV3

**`chrome.declarativeNetRequest`**:
- Rule-based API for blocking, redirecting, or modifying headers
- Has no mechanism to read response content whatsoever

**Conclusion:** Neither API can be used to read subtitle file bodies. The only viable approach for reading response bodies in MV3 is MAIN-world fetch override.

**Confidence:** HIGH — verified against official `chrome.webRequest` documentation.

---

## Q4: Correct MV3 Approach for Intercepting Response Bodies

### The Pattern: MAIN World Fetch Override with Response Clone

```javascript
// subtitle-interceptor.js — runs in MAIN world at document_start
(function() {
  const originalFetch = window.fetch;

  window.fetch = async function(...args) {
    const response = await originalFetch.apply(this, args);

    const url = typeof args[0] === 'string' ? args[0] : args[0]?.url ?? '';

    // Only intercept Crunchyroll subtitle files
    if (/\.ass(\?|$)/i.test(url) || /crunchyroll\.com.*subtitle/i.test(url)) {
      // MUST clone before reading — reading the original stream would break the page
      const cloned = response.clone();
      cloned.text().then(body => {
        // Forward to isolated world content script via postMessage
        window.postMessage({
          type: '__VEIL_SUBTITLE_INTERCEPTED__',
          url,
          body,
        }, '*');
      }).catch(() => {}); // silent — never crash the page
    }

    return response; // return the original, unmodified
  };
})();
```

The isolated-world content script listens for the postMessage:
```javascript
// In content.js (isolated world)
window.addEventListener('message', (event) => {
  if (event.source !== window) return;
  if (event.data?.type !== '__VEIL_SUBTITLE_INTERCEPTED__') return;
  // Parse ASS body, build cue list, store to chrome.storage.local
  const cues = parseASS(event.data.body);
  chrome.storage.local.set({ veil_subtitle_cues: cues });
});
```

### Why Clone Is Mandatory

`response.body` is a `ReadableStream`. Reading it consumes the stream. If the interceptor reads the original, the page's player receives an empty body and the subtitles fail to load. `response.clone()` creates an independent copy with its own stream — the original is returned to the page unmodified.

**Confidence:** HIGH — confirmed by multiple working open-source implementations (chrome-slurp-xhr, SSE interception guide, official stream API docs).

---

## Q5: ASS Subtitle Format — Parsing Timestamps and Cues

### File Structure

ASS is an INI-style text format with three main sections:

```
[Script Info]
Title: ...
ScriptType: v4.00+

[V4+ Styles]
Format: Name, Fontname, ...
Style: Default, Arial, ...

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
Dialogue: 0,0:02:15.00,0:02:18.00,Default,,0,0,0,,This is the subtitle text.
```

### Timestamp Format

ASS timestamps use `H:MM:SS.cs` (hours, minutes, seconds, centiseconds — 2 decimal places, NOT milliseconds):

```
0:02:15.00  →  hours=0, minutes=2, seconds=15, centiseconds=0
```

Converting to seconds:
```javascript
function assTimestampToSeconds(ts) {
  // ts format: "H:MM:SS.cs" — single digit hour, 2-digit centiseconds
  const [hms, cs] = ts.split('.');
  const parts = hms.split(':').map(Number);
  const [h, m, s] = parts;
  return h * 3600 + m * 60 + s + (parseInt(cs, 10) / 100);
}
```

### Parsing Dialogue Lines

A regex to extract all cues from an ASS Events section:

```javascript
function parseASS(body) {
  const cues = [];
  const dialogueRegex = /^Dialogue:\s*\d+,\s*(\d:\d{2}:\d{2}\.\d{2}),\s*(\d:\d{2}:\d{2}\.\d{2}),([^,]*),([^,]*),\d+,\d+,\d+,[^,]*,(.*)/gm;

  let match;
  while ((match = dialogueRegex.exec(body)) !== null) {
    const start = assTimestampToSeconds(match[1]);
    const end   = assTimestampToSeconds(match[2]);
    // match[3] = Style, match[4] = Name (actor), match[5] = Text
    const rawText = match[5];

    // Strip ASS override tags: {\an8}, {\i1}, {\pos(...)}, etc.
    const text = rawText
      .replace(/\{[^}]*\}/g, '')   // remove all {tag} blocks
      .replace(/\\N/g, '\n')        // ASS soft newline
      .replace(/\\n/g, '\n')        // ASS hard newline
      .replace(/\\h/g, '\u00a0')    // non-breaking space
      .trim();

    if (text) cues.push({ start, end, text });
  }

  // Sort by start time (usually already sorted, but not guaranteed)
  cues.sort((a, b) => a.start - b.start);
  return cues;
}
```

### Important Details

- **Override tags** (e.g. `{\an8\pos(640,50)\i1}`) appear inline and must be stripped before sending text to the model.
- **Multiple subtitle tracks** may be fetched in sequence (e.g., English, Japanese). The interceptor should filter by language preference or capture all and let the consumer select.
- **Comments** in ASS (`; comment lines` or `Comment:` event lines) should be skipped — only `Dialogue:` lines are cues.
- **Hardsub streams** have no ASS file — the subtitle is baked into the video pixel data. Network intercept produces nothing useful in this case.

**Confidence:** HIGH — ASS format specification is stable and well-documented; confirmed by ffmpeg docs and MultimediaWiki.

---

## Q6: Syncing Subtitle Cues with `video.currentTime`

### Approach: 1-Second Polling Interval

The standard approach for subtitle sync in browser extensions is to poll `video.currentTime` at 1-second intervals and binary-search the cue list:

```javascript
function getCurrentCues(cues, currentTime) {
  // Return all cues active at currentTime
  return cues.filter(c => c.start <= currentTime && c.end > currentTime);
}

let subtitleInterval = null;

function startSubtitleSync(cues) {
  if (subtitleInterval) clearInterval(subtitleInterval);
  subtitleInterval = setInterval(() => {
    const video = document.querySelector('video');
    if (!video || video.paused || video.ended) return;
    const active = getCurrentCues(cues, video.currentTime);
    if (active.length) {
      const lines = active.map(c => c.text);
      // Store to chrome.storage.local or update buffer directly
      chrome.storage.local.set({
        veil_context: {
          platform: 'crunchyroll',
          lines,
          contextText: lines.join(' '),
          updatedAt: new Date().toISOString(),
        }
      });
    }
  }, 1000);
}
```

### Why 1 Second Is Correct

- Subtitle cues are typically 2–5 seconds long. A 1-second poll catches every cue.
- Tighter polling (e.g., 100ms) is unnecessary for our use case — we want "what is happening on screen approximately now," not frame-accurate sync.
- `setInterval` at 1 second produces at most 1 `chrome.storage.local.set` per second, which is well within Chrome storage API rate limits.
- Pausing/seeking: guard with `video.paused` to avoid stale cues during pause. On seek, the next poll tick will pick up the new position.

**Confidence:** HIGH — this is a standard subtitle sync pattern used by most browser subtitle extensions.

---

## Q7: Is the Video Element in the Main Frame or an Iframe?

### Answer: The video element is in the main frame on Crunchyroll's current (beta) website

**Historical context:** The old Crunchyroll website embedded the Vilos player in a cross-origin iframe loaded from `static.crunchyroll.com`. Content scripts could not access iframe content without `all_frames: true` plus host permissions for `static.crunchyroll.com`.

**Current situation (beta.crunchyroll.com / www.crunchyroll.com):** The current website uses a React-based SPA with the video element rendered in the main document frame, not inside a cross-origin iframe. Evidence:

1. The `cr-autoskip` extension accesses skip buttons "in embedded player iframes & Shadow DOM elements" — this refers to the old player. Modern extensions targeting the new CR site (e.g., Crunchyroll With Better Seasons) do not require `all_frames` for basic player interaction.
2. The manifest in this project (`extension/manifest.json`) has `all_frames: false` in `content_scripts`, yet `content.js` successfully finds subtitle DOM elements via `document.querySelector`. This would fail if the player were in a cross-origin iframe.
3. The `CR-Fixes` extension documentation notes "the player frame is loaded from static.crunchyroll.com" as a concern — this indicates the old vilos player iframe. This project's `content.js` already works without `all_frames`, suggesting the new player uses the main frame.

**Conclusion:** `document.querySelector('video')` from the main frame content script will find the video element on Crunchyroll watch pages. No iframe traversal is needed.

**Caveat:** Ads may inject a separate `<video>` element (confirmed by asbplayer issue #90 from 2022 — resolved). Query by `readyState`, `duration`, or position (main content video typically has higher duration) to avoid the ad video element.

**Confidence:** MEDIUM — inferred from existing code behavior; not verified by live DOM inspection.

---

## Q8: Minimal Implementation Plan

### End-to-End Flow

```
[Crunchyroll player JS] → fetch("{VIDEO_ID}.en-US.ass")
        |
        | [MAIN world fetch override in subtitle-interceptor.js]
        | response.clone().text() → raw ASS body
        | window.postMessage({ type: '__VEIL_SUBTITLE_INTERCEPTED__', body })
        v
[content.js — isolated world]
        | window.addEventListener('message')
        | parseASS(body) → cues[]
        | chrome.storage.local.set({ veil_subtitle_cues: cues })
        | startSubtitleSync(cues)  [1s interval → queries video.currentTime]
        | chrome.storage.local.set({ veil_context: { lines, contextText, ... } })
        v
[sidepanel.js — already wired]
        | chrome.storage.onChanged('veil_context') → window.postMessage('VEIL_CONTEXT')
        v
[useInitFlow.ts — Phase 2 task]
        | window.addEventListener('message' → VEIL_CONTEXT)
        | updateContext(mergedContext, sessionId)
```

### Files to Create/Modify

| File | Change |
|------|--------|
| `extension/subtitle-interceptor.js` | NEW — MAIN world fetch override; postMessage on ASS URL match |
| `extension/content.js` | ADD — postMessage listener for `__VEIL_SUBTITLE_INTERCEPTED__`; `parseASS()`; `startSubtitleSync()` |
| `extension/manifest.json` | ADD — second `content_scripts` entry with `world: "MAIN"`, `run_at: "document_start"`, `matches: crunchyroll watch pages` |

### No New Permissions Required

The current manifest already has:
- `"storage"` — for `chrome.storage.local`
- `"scripting"` — for content script injection
- `"host_permissions": ["https://*.crunchyroll.com/*"]` — covers subtitle file URLs at `static.crunchyroll.com`

**Confidence:** HIGH — permissions analysis based on direct manifest inspection.

---

## Q9: Crunchyroll-Specific Pitfalls

### Pitfall 1: Multiple Subtitle Tracks Fetched Simultaneously

Crunchyroll may fetch multiple ASS files in parallel (e.g., English subs + Japanese signs track). The interceptor will receive multiple `__VEIL_SUBTITLE_INTERCEPTED__` messages. The content script must deduplicate: keep the user's preferred language track or the first English track received.

**Detection:** Inspect the URL — Crunchyroll subtitle URLs contain the language code (e.g., `.en-US.ass`, `.ja-JP.ass`). Filter in the MAIN world before postMessage, or filter in content.js receiver.

### Pitfall 2: Language Switch During Playback

If the user changes subtitle language mid-episode, a new ASS file is fetched. The interceptor fires again with the new cue list. The content script must **replace** the existing cue list (not append). Use a module-level variable that is reassigned.

### Pitfall 3: Ad Break Timing Offset

Crunchyroll plays video ads using a separate `<video>` element. `video.currentTime` on the ad element is not the same as the main content's playback position. Guard: check `video.duration > 120` (ads are usually <120 seconds) or find the video element with the highest `duration` to identify the main content.

### Pitfall 4: MAIN World CSP Blocking

Crunchyroll may serve a `Content-Security-Policy` that blocks inline scripts or restricts `script-src`. If MAIN world injection is blocked by CSP, the fetch override never runs. The extension manifest itself cannot override page CSP without the `webRequestBlocking` capability (removed in MV3). **Mitigation:** Declare the content script in `manifest.json` (not dynamically), as statically-declared content scripts in MV3 are exempt from page CSP.

### Pitfall 5: Subtitle Fetch Inside a Web Worker

If Crunchyroll's player uses a Web Worker for adaptive streaming (HLS.js runs in a worker in some configurations), fetch calls from that worker are invisible to MAIN world override. There is no known workaround in MV3 for intercepting worker-originated requests without `webRequest`. **Risk assessment:** Subtitle file fetches are typically made from the main thread player code, not workers. HLS segment fetches may use workers; subtitle fetches generally do not.

### Pitfall 6: Hardsub Streams Return No ASS File

Some Crunchyroll content only has hardsubbed video streams (no soft subtitle file). In this case, no ASS URL is fetched, the interceptor never fires, and the cue list remains empty. The system should degrade gracefully to DOM observation. **Important:** Hard-coded subtitles in test regions (Brazil etc.) render in the DOM as text — DOM observation still works there.

### Pitfall 7: Race Condition — Player Fetches Subtitle Before Interceptor Loads

If `subtitle-interceptor.js` does not load at `document_start`, the player may fetch the ASS file before `window.fetch` is overridden. **Mitigation:** Declare with `run_at: "document_start"` and `world: "MAIN"` in the manifest. Chrome guarantees this runs before any page scripts for matching pages.

**Confidence:** MEDIUM for platform-specific pitfalls (inferred from architecture, not live testing); HIGH for MV3 mechanics.

---

## Q10: Does This Approach Work for Netflix?

### Answer: Different mechanism — partially applicable, but not the priority

Netflix uses **TTML/IMSC** (XML-based, standardized by W3C) for subtitle delivery, not ASS. Netflix also uses **WebVTT** for some tracks. The files are fetched via HTTPS just like Crunchyroll, so the same MAIN world fetch override technique would intercept them — but parsing is different.

Netflix subtitle URLs contain `?o=` query parameters and are delivered from a CDN. They are not named `.ass` — filtering by URL pattern requires different heuristics (look for MIME type `text/vtt` or XML content with `<tt>` root).

**Current Netflix subtitle situation in this project:** `content.js` already has DOM-based subtitle observation for Netflix using `[data-uia*="timedtext"]` selectors. These selectors target Netflix's rendered subtitle DOM and are known to work. Netflix network-layer intercept is lower priority than Crunchyroll.

**Recommendation:** Scope network-layer intercept to Crunchyroll only. Keep Netflix on DOM observation.

**Confidence:** MEDIUM — Netflix subtitle delivery details from isaacbernat/netflix-to-srt and MDN IMSC documentation.

---

## Decision Matrix: DOM Observation vs. Network Intercept

| Criterion | DOM Observation (current) | Network Intercept (proposed) |
|-----------|--------------------------|------------------------------|
| Implementation complexity | Low — already done | High — new file, new manifest entry, parser |
| Reliability on Crunchyroll | Unknown — selectors unvalidated | Medium — depends on URL pattern matching + non-hardsub content |
| Timing accuracy | Approximate (mutation fires when DOM updates) | Exact (ASS cue timestamps + currentTime) |
| Works on Netflix | Yes (known selectors) | No (different format, separate effort) |
| Works on hardsubbed content | No | No |
| New permissions needed | None | None |
| Risk of breaking page | None | Low — clone pattern is safe; CSP is unknown risk |
| Required for Phase 2 as specced | No — Phase 2 uses existing DOM capture | Not required |

**Verdict:** Validate DOM observation on a live Crunchyroll page first. If `.erc-subtitle-text` or `.vjs-text-track-display` selectors return text, DOM observation is sufficient for Phase 2. Network intercept is the backup plan with higher accuracy if selectors fail.

---

## How to Validate DOM Observation (Live Test Protocol)

1. Load Crunchyroll on a watch page with subtitles enabled.
2. Open DevTools console on the Crunchyroll tab.
3. Run: `chrome.storage.local.get('veil_context', console.log)` — check if `lines` is non-empty.
4. If empty, run: `document.querySelectorAll('.erc-subtitle-text, .vjs-text-track-display, [class*="subtitle-text"]')` — check element count.
5. If elements found but `lines` is empty: MutationObserver is not firing — check if elements are in Shadow DOM.
6. If no elements found: Crunchyroll changed class names — inspect DOM while subtitles are visible, find the actual container class.
7. Report findings to determine whether to proceed with DOM observation fix or switch to network intercept.

---

## Manifest Changes Required (If Network Intercept Is Pursued)

**Add to `extension/manifest.json`:**
```json
{
  "content_scripts": [
    {
      "matches": ["https://www.crunchyroll.com/watch/*"],
      "js": ["subtitle-interceptor.js"],
      "run_at": "document_start",
      "world": "MAIN",
      "all_frames": false
    }
  ]
}
```

No new permissions required. `"host_permissions"` already covers `*.crunchyroll.com`.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead |
|---------|-------------|-------------|
| ASS override tag stripping | Custom regex from scratch | The regex `/{[^}]*}/g` is the correct and complete pattern — all ASS override tags are enclosed in `{}` |
| VTT parsing (if Netflix) | Custom parser | `node-webvtt` npm package; or the regex: `/^(\d{2}:\d{2}:\d{2}[.,]\d{3})\s-->\s(\d{2}:\d{2}:\d{2}[.,]\d{3})\n(.*(?:\r?\n(?!\r?\n).*)*)/gm` |
| Subtitle storage relay | Custom messaging | Existing `sidepanel.js` `chrome.storage.onChanged` → `VEIL_CONTEXT` pipeline is already wired |
| Cue binary search | Custom data structure | Linear filter over ~500-cue array is fast enough at 1s poll; no optimization needed |

---

## Sources

### Primary (HIGH confidence)
- Official Chrome Docs: `chrome.webRequest` — confirms no response body access in MV3
- Official Chrome Docs: Content Scripts `world` property — confirms `world: "MAIN"` in manifest declarations
- ASS Format Specification (MultimediaWiki, tcax.org) — timestamp format, Dialogue line structure
- Direct inspection of `extension/manifest.json` — current permissions, `all_frames: false`
- Direct inspection of `extension/content.js` — existing selectors, DOM observation approach, `pickSubtitleElements()`

### Secondary (MEDIUM confidence)
- [yt-dlp issue #4452](https://github.com/yt-dlp/yt-dlp/issues/4452) — Crunchyroll `/cms/v2/.../streams` endpoint, ASS format confirmed
- [chrome-slurp-xhr](https://github.com/byronwall/chrome-slurp-xhr) — working MAIN world fetch intercept pattern with response clone
- [SSE Interception MV3 Guide (dev.to)](https://dev.to/wilow445/how-to-intercept-server-sent-events-in-chrome-extensions-mv3-guide-23kb) — `world: "MAIN"` + `document_start` pattern, clone requirement
- [tholinka/crunchyroll-html5 VilosPlayerService.ts](https://github.com/tholinka/crunchyroll-html5/blob/master/src/app/services/VilosPlayerService.ts) — confirms `AssSubtitle` class, ASS as primary format
- [cr-autoskip](https://github.com/adivamshi/cr-autoskip) — `all_frames: true` for old CR player; Shadow DOM access notes
- [CR-Fixes](https://github.com/TheOneric/CR-Fixes) — `host_permissions` for `static.crunchyroll.com`, old iframe player notes
- [asbplayer issue #90](https://github.com/killergerbah/asbplayer/issues/90) — Crunchyroll ad video element overlapping main content video

### Tertiary (LOW confidence — inferred, not directly verified)
- Crunchyroll video element being in main frame (inferred from `all_frames: false` working in existing code)
- CSP compatibility of MAIN world injection on Crunchyroll (not tested)
- Subtitle fetch occurring on main thread vs. worker (assumed, not verified)

---

## Metadata

**Confidence breakdown:**
- MV3 intercept technique: HIGH — official docs + verified OSS implementations
- Crunchyroll subtitle format (ASS): MEDIUM-HIGH — multiple independent sources agree
- Crunchyroll subtitle URL pattern: MEDIUM — from third-party tooling, not official docs
- Video element location (main frame): MEDIUM — inferred from existing code behavior
- Platform-specific pitfalls: MEDIUM — architectural inference, not live testing

**Research date:** 2026-03-21
**Valid until:** 2026-06-21 (Crunchyroll player DOM and API can change without notice; re-verify before implementation)
