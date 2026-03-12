# SpoilerShield – Agent Handoff Guide

This file is for **AI coding agents** (and humans) switching into this project. Read it first so handoffs are smooth and you can pick up where the last session left off.

---

## 1. Start Here

| Document | Purpose |
|----------|---------|
| **CLAUDE.md** (this file) | Quick orientation, current bugs, handoff checklist |
| **PROJECT_CONTEXT.md** | Full PRD + architecture + change log + how to work on the project |

**Before making changes:** Read `PROJECT_CONTEXT.md` fully. Skim the key files listed in PROJECT_CONTEXT.md (Index.tsx, useChat.ts, useEpisodeRecap.ts, spoiler-shield-chat/index.ts).

---

## 2. Agent Operating Principles

These rules govern how every agent should work on this project. Apply them every session.

### 2.1 Plan Mode Default
- Enter plan mode for ANY non-trivial task (3+ steps or architectural decisions)
- If something goes sideways, STOP and re-plan immediately — don't keep pushing
- Use plan mode for verification steps, not just building
- Write detailed specs upfront to reduce ambiguity

### 2.2 Subagent Strategy
- Use subagents liberally to keep the main context window clean
- Offload research, exploration, and parallel analysis to subagents
- For complex problems, throw more compute at it via subagents
- One task per subagent for focused execution

### 2.3 Self-Improvement Loop
- After ANY correction from the user: update `tasks/lessons.md` with the pattern
- Write rules for yourself that prevent the same mistake
- Ruthlessly iterate on these lessons until mistake rate drops
- Review `tasks/lessons.md` at session start for relevant context

### 2.4 Verification Before Done
- Never mark a task complete without proving it works
- Diff behavior between main and your changes when relevant
- Ask yourself: "Would a staff engineer approve this?"
- Run tests, check logs, demonstrate correctness

### 2.5 Demand Elegance (Balanced)
- For non-trivial changes: pause and ask "is there a more elegant way?"
- If a fix feels hacky: "Knowing everything I know now, implement the elegant solution"
- Skip this for simple, obvious fixes — don't over-engineer
- Challenge your own work before presenting it

### 2.6 Autonomous Bug Fixing
- When given a bug report: just fix it. Don't ask for hand-holding
- Point at logs, errors, failing tests — then resolve them
- Zero context switching required from the user

### 2.7 Task Management
1. **Plan First**: Write plan to `tasks/todo.md` with checkable items (`tasks/` dir — create if absent)
2. **Verify Plan**: Check in before starting implementation on large changes
3. **Track Progress**: Mark items complete as you go
4. **Explain Changes**: High-level summary at each step
5. **Document Results**: Add review section to `tasks/todo.md`
6. **Capture Lessons**: Update `tasks/lessons.md` after any user correction

### 2.8 Core Principles
- **Simplicity First**: Make every change as simple as possible. Impact minimal code.
- **No Laziness**: Find root causes. No temporary fixes. Senior developer standards.

---

## 3. Repo Layout (Where Things Live)

```
spoiler-shield/
├── extension/           # Chrome extension
│   ├── background.js    # Service worker: opens side panel, injects content.js into matching tabs
│   ├── content.js       # Page detection (show title, episode from Crunchyroll/Netflix)
│   └── sidepanel.js     # Iframe bridge, postMessage, storage listener
├── src/
│   ├── pages/Index.tsx  # Root: branches on isSidePanel → SidePanelApp | WebApp
│   ├── hooks/
│   │   ├── useChat.ts          # Chat API, streaming, storageKey param (session-aware)
│   │   ├── useSessionStore.ts  # Session CRUD, localStorage, migration from legacy key
│   │   ├── useInitFlow.ts      # Init state machine: detecting→resolving→ready/needs-episode/no-show
│   │   ├── useEpisodeRecap.ts  # TVMaze → Fandom → Web search recap, sanitize, cache
│   │   ├── useLocalStorage.ts
│   │   └── useSidePanel.ts
│   ├── components/
│   │   ├── StatusBadge.tsx     # Badge + Popover (show/episode/context config)
│   │   ├── HistorySheet.tsx    # Left-side Sheet: session list, switch, delete
│   │   ├── EpisodePicker.tsx   # Inline episode picker for needs-episode phase
│   │   ├── ChatStatusBar.tsx   # Status bar between messages and input
│   │   ├── Header.tsx          # Side-panel: brand + StatusBadge + history icon
│   │   ├── ShowSearch.tsx      # TVMaze search autocomplete
│   │   ├── EpisodeSelector.tsx # Season/episode dropdowns
│   │   └── steps/
│   │       ├── ContextStep.tsx # Reused inside StatusBadge popover
│   │       └── QAStep.tsx      # Chat history + input (meta/phase aware)
│   └── lib/types.ts     # WatchSetup, ChatMessage, SessionMeta, InitPhase, EpisodeSource, etc.
├── supabase/functions/
│   ├── spoiler-shield-chat/       # Main Q&A endpoint (streaming)
│   ├── fetch-web-episode-recap/   # Gemini Search Grounding; universal episode recap
│   ├── fetch-fandom-episode/      # JJK S1 Fandom wiki fetch + parse
│   ├── sanitize-episode-context/  # LLM pass to strip future spoilers from any recap
│   ├── audit-answer/              # Second-pass spoiler audit (deployed, not yet wired in client)
│   └── log-spoiler-report/
├── PROJECT_CONTEXT.md   # Single source of truth (product, architecture, changelog)
├── CLAUDE.md            # This file
├── MIGRATION_GUIDE.md   # Supabase project migration
└── .env.example         # VITE_SUPABASE_*, GOOGLE_AI_API_KEY set as Supabase secret
```

---

## 4. Current State (As of Last Session)

- **Deployed:** Backend is Supabase Edge Functions (project ref `dbileyqtnisyqzgwwive`). Frontend hosted on Lovable; local dev via `npm run dev`.
- **LLM:** All LLM calls use **Google Generative AI native API** (`GOOGLE_AI_API_KEY` Supabase secret). Chat/audit: `gemini-3-flash-preview` (streaming). Web recap + sanitize: `gemini-2.0-flash` (non-streaming, supports Search Grounding). All functions self-contained — no shared module imports.
- **Chat:** Working end-to-end for any show. Streams correctly. Works without episode context (model uses general show knowledge). `useChat.ts` parses `candidates[0].content.parts[0].text`.
- **UX:** Chat-first side panel. Panel opens directly to chat — no wizard. Sessions per show+episode; history drawer for switching.
- **Context pipeline:** Five-tier fallback — TVMaze episode (sanitized) → AniList show overview (sanitized) → Fandom (JJK S1) → Gemini web search → model knowledge. Netflix no-episode path uses TVMaze show-level summary directly (bypasses `fetchRecap`).
- **Detection:** `background.js` programmatically injects `content.js` on icon click and `tabs.onUpdated` — works on already-open tabs after extension reload. Netflix episode info is unreliable (player UI only); episode dedup uses URL pathname.
- **Extension build:** `BUILD_TARGET=extension npm run build` compiles `src/` into `extension/app/assets/index.js`. Must run after any `src/` changes.
- **Audit pass:** Wired and active on the spoiler-risk path (`classify-question` → `audit-answer`). Both functions must be deployed and responding for this path to execute. `classify-question` deployment status should be confirmed before relying on the audit path in production.

---

## 5. Rules & Constraints

- Do not add new dependencies without documenting the reason in PROJECT_CONTEXT.md Section 7 (Change Log).
- Do not modify the system prompt in `spoiler-shield-chat` without updating PROJECT_CONTEXT.md Section 3 (Spoiler Policy).
- Do not bypass or weaken the spoiler safety contract, even for testing.
- Do not commit secrets or API keys. `.env.local` must stay in `.gitignore`. Supabase secrets are set via CLI only.
- Do not remove or modify `useRef`-based guards in `Index.tsx` or `useEpisodeRecap.ts` without understanding the infinite-loop history (see PROJECT_CONTEXT.md Change Log).
- If you add debug/instrumentation code, note it in CLAUDE.md Section 6 (Current Bugs) so the next agent knows to remove or keep it.
- When debugging LLM behavior: confirm the browser hits the correct Supabase URL, that `spoiler-shield-chat` is deployed with the latest system prompt, and what `context` text is being sent; compare with Lovable-hosted version if available to spot deployment or prompt drift.

---

## 6. Smoke Test Checklist

After making changes, run this quick manual check to catch regressions:

1. `npm run dev` starts without errors.
2. Open the Chrome extension side panel on a Crunchyroll episode page — panel opens directly to chat (no wizard).
3. Badge shows detected show + episode. ChatStatusBar shows recap loading, then "Shielding based on SxEy knowledge."
4. Ask a safe question (e.g. "Who is Gojo?") — answer streams back without error.
5. Ask a spoiler-risk question (e.g. "Does Yuji die?") — playful refusal, no spoilers.
6. Navigate to a different show without refreshing — detection re-runs automatically.
7. Open on the Crunchyroll home page — panel shows "Pick something to watch 🍿".
8. Try a show with no TVMaze summary (e.g. Kingdom) — web search recap loads, chat works.
9. Netflix watch page: `JSON.parse(localStorage.getItem('spoilershield-sessions') || '[]').find(s => s.platform === 'netflix')` — context field should be non-empty after detection.
10. No console errors related to `useEffect` loops or missing refs.

---

## 7. Current Bugs / Open Issues

| Issue | Status |
|-------|--------|
| Chat 500 (Lovable gateway) | Fixed 2026-02-17 |
| 404 on OpenAI-compatible endpoint | Fixed 2026-02-19 (native Gemini API) |
| `gemini-2.0-flash` not available for API key | Fixed 2026-02-21 (switched to `gemini-3-flash-preview`) |
| React hooks violation in Index.tsx | Fixed 2026-02-21 (useCallbacks moved above conditional) |
| 4-step wizard friction | Fixed 2026-02-21 (chat-first UX rewrite) |
| Netflix recap not saving (stale `activeSessionIdRef`) | Fixed 2026-03-07 — all `updateContext` calls now pass explicit `sessionId` |
| Netflix episode navigation dedup broken (trackId in URL) | Fixed 2026-03-07 — sidepanel.js + useInitFlow.ts use pathname only |
| Crunchyroll homepage false-positive detection | Fixed 2026-03-07 — content.js Methods 4/5 gated to `/series/` and `/watch/` paths |
| Netflix episode number unreliable | **Open** — player UI only; active session may show wrong episode. Needs KB (content ID → episode mapping). |
| Netflix no-episode path skips AniList | **Fixed 2026-03-08** — `doTVMazeLookupAndCreateSession` now calls `get-show-context`, which includes AniList fallback. `showSummary = kbData.context`. |
| Netflix content ID not used for fast DB lookup | **Fixed 2026-03-08** — Phase 2: `useInitFlow` extracts `netflixContentId` from URL and forwards to `get-show-context`; Step 0 fast-path returns O(1) cached result; mapping written on all cold/warm paths. |
| Netflix episode not updating on "Next Episode" click | **Fix in progress** — Added `chrome.webNavigation.onHistoryStateUpdated` listener in `background.js` (Netflix only) + `"webNavigation"` permission in manifest. Sends `REDETECT_SHOW_INFO` immediately on pushState nav. Awaiting user confirmation. |
| Netflix movies cause infinite "Detecting..." loop | **Fix in progress** — Replaced orphaned `<title>` element observer with `document.head` observer + 1s/2s/3s retry polling. Awaiting user confirmation. |

---

## 8. Upcoming Work (Prioritized)

1. **Fix Netflix SPA navigation** – Fix in progress (webNavigation listener added). Confirm working, then close out.
2. **Fix Netflix movie scraping** – Fix in progress (head observer + retry polling). Confirm working, then close out.
3. **Add `season`/`episode` to `id_mappings`** – DB migration to store episode-level Netflix content ID mappings. After fixing SPA nav so episode info flows correctly, persist it so future users get O(1) episode resolution too.
4. **Netflix subtitle context** – content.js already captures subtitle lines into `spoilershield_context`. Wire this into the chat context pipeline so the model knows where in the episode the user currently is.
5. **Chrome Web Store submission** – Prep store listing (description, screenshots, privacy policy).
6. **Re-enable audit pass** – Wire `audit-answer` in `useChat.ts` after streaming; show "Safety edit applied" when answer is modified.
7. **Polish StatusBadge popover** – Show names truncate at 18 chars in badge; full name visible in popover.

---

## 9. Handoff Checklist (When You Pause)

When you stop and hand off to another agent or return later:

- [ ] **PROJECT_CONTEXT.md** – Section 7 (Change Log) updated with what you did this session.
- [ ] **PROJECT_CONTEXT.md** – Section 6 (Known Limitations) and Section 4/5 updated if you changed behavior or env.
- [ ] **CLAUDE.md** – Section 6 (Current Bugs) and Section 7 (Upcoming Work) updated if you fixed a bug or reprioritized.
- [ ] No **secrets** in repo (`.env.local` in `.gitignore`; secrets only in Supabase dashboard).
- [ ] If you added debug/instrumentation, note it in PROJECT_CONTEXT or CLAUDE.md so the next agent knows to remove or keep it.

---

## 10. Quick Commands

```bash
# Local dev
npm install && npm run dev

# Supabase (from repo root)
supabase login
supabase link --project-ref dbileyqtnisyqzgwwive
supabase secrets list
# GOOGLE_AI_API_KEY should already be set; if not: supabase secrets set GOOGLE_AI_API_KEY=your-key
supabase functions deploy spoiler-shield-chat
supabase functions deploy fetch-web-episode-recap
supabase functions deploy fetch-fandom-episode
supabase functions deploy sanitize-episode-context
supabase functions deploy audit-answer
supabase functions deploy log-spoiler-report
```

---

*Last updated: 2026-02-23 (detection fix, universal context pipeline, web search recap).*
