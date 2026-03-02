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

## 2. Repo Layout (Where Things Live)

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

## 3. Current State (As of Last Session)

- **Deployed:** Backend is Supabase Edge Functions (project ref `dbileyqtnisyqzgwwive`). Frontend hosted on Lovable; local dev via `npm run dev`.
- **LLM:** All LLM calls use **Google Generative AI native API** (`GOOGLE_AI_API_KEY` Supabase secret). Chat/audit: `gemini-3-flash-preview` (streaming). Web recap + sanitize: `gemini-2.0-flash` (non-streaming, supports Search Grounding). All functions self-contained — no shared module imports.
- **Chat:** Working end-to-end for any show. Streams correctly. Works without episode context (model uses general show knowledge). `useChat.ts` parses `candidates[0].content.parts[0].text`.
- **UX:** Chat-first side panel. Panel opens directly to chat — no wizard. Sessions per show+episode; history drawer for switching.
- **Context pipeline:** Four-tier fallback — TVMaze (sanitized) → Fandom (JJK S1) → Gemini web search → model knowledge. All recap text goes through `sanitize-episode-context` before use.
- **Detection:** `background.js` programmatically injects `content.js` on icon click and `tabs.onUpdated` — works on already-open tabs after extension reload.
- **Audit pass:** Deployed but not wired into `useChat.ts` — re-enable after confirming chat stability.

---

## 4. Rules & Constraints

- Do not add new dependencies without documenting the reason in PROJECT_CONTEXT.md Section 7 (Change Log).
- Do not modify the system prompt in `spoiler-shield-chat` without updating PROJECT_CONTEXT.md Section 3 (Spoiler Policy).
- Do not bypass or weaken the spoiler safety contract, even for testing.
- Do not commit secrets or API keys. `.env.local` must stay in `.gitignore`. Supabase secrets are set via CLI only.
- Do not remove or modify `useRef`-based guards in `Index.tsx` or `useEpisodeRecap.ts` without understanding the infinite-loop history (see PROJECT_CONTEXT.md Change Log).
- If you add debug/instrumentation code, note it in CLAUDE.md Section 6 (Current Bugs) so the next agent knows to remove or keep it.
- When debugging LLM behavior: confirm the browser hits the correct Supabase URL, that `spoiler-shield-chat` is deployed with the latest system prompt, and what `context` text is being sent; compare with Lovable-hosted version if available to spot deployment or prompt drift.

---

## 5. Smoke Test Checklist

After making changes, run this quick manual check to catch regressions:

1. `npm run dev` starts without errors.
2. Open the Chrome extension side panel on a Crunchyroll episode page — panel opens directly to chat (no wizard).
3. Badge shows detected show + episode. ChatStatusBar shows recap loading, then "Shielding based on SxEy knowledge."
4. Ask a safe question (e.g. "Who is Gojo?") — answer streams back without error.
5. Ask a spoiler-risk question (e.g. "Does Yuji die?") — playful refusal, no spoilers.
6. Navigate to a different show without refreshing — detection re-runs automatically.
7. Open on the Crunchyroll home page — panel shows "Pick something to watch 🍿".
8. Try a show with no TVMaze summary (e.g. Kingdom) — web search recap loads, chat works.
9. No console errors related to `useEffect` loops or missing refs.

---

## 6. Current Bugs / Open Issues

No active bugs. All previously known issues are resolved.

| Issue | Status |
|-------|--------|
| Chat 500 (Lovable gateway) | Fixed 2026-02-17 |
| 404 on OpenAI-compatible endpoint | Fixed 2026-02-19 (native Gemini API) |
| `gemini-2.0-flash` not available for API key | Fixed 2026-02-21 (switched to `gemini-3-flash-preview`) |
| React hooks violation in Index.tsx | Fixed 2026-02-21 (useCallbacks moved above conditional) |
| 4-step wizard friction | Fixed 2026-02-21 (chat-first UX rewrite) |

---

## 7. Upcoming Work (Prioritized)

1. **Netflix detection** – Get `content.js` reliably reading show title + episode from Netflix URLs/DOM. Smoke test full flow (detection → chat → spoiler safety). Once confirmed, update README + landing page to list Netflix as supported. Then submit to Chrome Web Store.
2. **Chrome Web Store submission** – Prep store listing (description, screenshots, privacy policy). Netflix support should be confirmed first.
3. **Re-enable audit pass** – Wire `audit-answer` in `useChat.ts` after streaming; show "Safety edit applied" when answer is modified. Remove the empty-context 400 guard in `audit-answer/index.ts` first.
4. **Polish StatusBadge popover** – Show names truncate at 18 chars in badge; full name visible in popover.
5. **`needs-episode` with no showId** – If TVMaze lookup fails entirely, `EpisodePicker` can't render (requires showId). Fallback: show manual season/episode text inputs.

---

## 8. Handoff Checklist (When You Pause)

When you stop and hand off to another agent or return later:

- [ ] **PROJECT_CONTEXT.md** – Section 7 (Change Log) updated with what you did this session.
- [ ] **PROJECT_CONTEXT.md** – Section 6 (Known Limitations) and Section 4/5 updated if you changed behavior or env.
- [ ] **CLAUDE.md** – Section 6 (Current Bugs) and Section 7 (Upcoming Work) updated if you fixed a bug or reprioritized.
- [ ] No **secrets** in repo (`.env.local` in `.gitignore`; secrets only in Supabase dashboard).
- [ ] If you added debug/instrumentation, note it in PROJECT_CONTEXT or CLAUDE.md so the next agent knows to remove or keep it.

---

## 9. Quick Commands

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
