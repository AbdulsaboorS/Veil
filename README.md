# Veil

*A spoiler-safe Q&A side panel for anime & TV — built as a Chrome extension.*

Veil lets you ask questions while watching a show without getting spoiled. It lives in Chrome's side panel alongside the video player, detects what you're watching automatically, and answers questions using only what you've already seen.

Built end-to-end: product design, extension UX, React frontend, AI pipeline, and Supabase Edge Functions.

---

## How it works

1. **Open Crunchyroll or Netflix** — the extension detects your show and episode automatically. No setup required.
2. **Ask anything in the panel** — who's that character, what just happened, what's this power?
3. **Get a spoiler-safe answer** — the shield knows exactly where you are in the story. It answers what's safe and refuses what isn't, playfully.

The experience is fully automated. The only thing you need to do is ask.

---

## What's working

### Extension
- **Auto-detection** — detects show title and episode from Crunchyroll and Netflix URLs/DOM. Re-detects automatically when you navigate to a different show.
- **Chat-first side panel** — panel opens directly to chat, no wizard or setup flow. Sessions are per show + episode and persist across browser restarts.
- **Session history** — left-side drawer to switch between or delete past sessions.
- **Warm-ping on open** — both edge functions are pinged the moment the panel loads, eliminating cold-start latency on the first question.

### AI pipeline
- **Question classification** — each question is classified as `SAFE_BASICS`, `AMBIGUOUS`, or `SPOILER_RISK` in parallel with the chat fetch (no sequential latency penalty).
- **Safe path** — real SSE streaming directly to the UI. First tokens appear within ~500ms on warm functions.
- **Spoiler-risk path** — response is collected silently, audited by a second-pass LLM, then animated in via fake-stream. No spoilers leak.
- **Four-tier context pipeline** — TVMaze episode summaries → Fandom wiki (JJK S1) → Gemini web search grounding → model knowledge fallback. All recap text is sanitized before use.

### UI
- Deep space dark palette (`#0D0D14` base, `#7C6FF7` soft violet accent)
- iMessage-style chat bubbles with spring pop animation on new messages
- Glassmorphism header with inline SVG shield logo (breathing sparkle animation)
- Pill input with integrated send button and focus glow
- Typing indicator dots while waiting for first streaming chunk
- Space Grotesk brand font + DM Sans body

---

## Tech stack

| Layer | Technology |
|---|---|
| Extension | Chrome MV3, Manifest V3, content scripts |
| Frontend | React 18, Vite, TypeScript, Tailwind CSS, shadcn/ui |
| Backend | Supabase Edge Functions (Deno) |
| AI | Google Gemini API (`gemini-3-flash-preview`) — native, not OpenAI-compatible |
| Storage | `localStorage` (sessions + messages, no server-side user data) |

---

## Repo structure

```
spoiler-shield/
├── extension/
│   ├── background.js          # Service worker: opens side panel, injects content.js
│   ├── content.js             # Page detection (show title + episode from DOM/URL)
│   └── sidepanel.js           # postMessage bridge between extension and React app
├── src/
│   ├── pages/Index.tsx        # Root: branches on isSidePanel → SidePanelApp | WebApp
│   ├── hooks/
│   │   ├── useChat.ts         # Chat API, streaming, parallel classify fetch, warm-ping
│   │   ├── useSessionStore.ts # Session CRUD, localStorage, migration
│   │   ├── useInitFlow.ts     # Init state machine: detecting → resolving → ready
│   │   └── useEpisodeRecap.ts # Four-tier context pipeline
│   └── components/
│       ├── Header.tsx         # Glassmorphism header + shield logo
│       ├── StatusBadge.tsx    # Show/episode pill + settings popover
│       ├── ChatStatusBar.tsx  # Shielding status between messages and input
│       ├── HistorySheet.tsx   # Session history drawer
│       └── steps/QAStep.tsx  # iMessage chat bubbles + pill input
└── supabase/functions/
    ├── spoiler-shield-chat/   # Main Q&A endpoint (Gemini SSE streaming)
    ├── classify-question/     # Spoiler risk classifier (YES/NO, parallel with chat)
    ├── audit-answer/          # Second-pass spoiler audit for risky answers
    ├── fetch-web-episode-recap/   # Gemini Search Grounding — universal recap
    ├── fetch-fandom-episode/      # JJK S1 Fandom wiki fetch + parse
    └── sanitize-episode-context/  # Strips future spoilers from any recap text
```

---

## Supported platforms

| Platform | Detection | Status |
|---|---|---|
| Crunchyroll | URL + DOM | ✅ Working |

---

## Upcoming

- Publish to Chrome Web Store
- Timestamp-aware answers (knowing exactly what scene you're at mid-episode)
- Broader platform support
