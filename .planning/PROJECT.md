# Veil (formerly SpoilerShield)

## What This Is

Veil is a Chrome MV3 side-panel companion for Crunchyroll and Netflix. While the user is watching, they can ask spoiler-safe questions about the show or current scene. The assistant answers like a smart friend watching with you — helpful, real, and never revealing what's ahead.

## Core Value

The user can ask anything about what they're watching and get a real, helpful answer that never spoils what's coming next.

## Requirements

### Validated

<!-- Shipped and confirmed working in production. -->

- ✓ Auto-detects show + episode from Crunchyroll and Netflix DOM/URL — existing
- ✓ Chat-first side panel (no wizard) opens directly to conversation — existing
- ✓ Sessions per show+episode with history drawer — existing
- ✓ Five-tier context pipeline: TVMaze → AniList → Fandom → Gemini web search → model knowledge — existing
- ✓ Spoiler-risk classification (classify-question) + fake-stream on spoiler path — existing
- ✓ `🛡️ Spoiler Blocked` badge animation after spoiler-risk responses — existing
- ✓ Netflix content ID fast-path (O(1) Supabase KB lookup) — existing
- ✓ Session-first init (no re-detection on open/close) — existing
- ✓ Streaming SSE chat via Supabase Edge Functions + Gemini native API — existing

### Active

<!-- Current milestone: v1 Launch -->

- [ ] Rebrand all user-visible strings and storage keys from SpoilerShield → Veil
- [ ] Subtitle context (captured by content.js) wired into chat context pipeline
- [ ] Extension submitted to Chrome Web Store under Veil brand

### Out of Scope

- Netflix SPA navigation (Next Episode button) — deprioritized for v1; fix in progress but not blocking
- Netflix movie scraping — deprioritized for v1
- Crunchyroll movie support — no season/episode in URL, intentionally out of scope for v1
- Audit pass (audit-answer) — disabled; system prompt + classify-question are sufficient for v1
- Real-time subtitle transcript — rolling buffer only, not full transcript

## Context

- **Tech stack:** React + Vite + Tailwind + shadcn/ui compiled into Chrome MV3 extension (`extension/app/`). Backend: Supabase Edge Functions (Deno). LLM: Google Gemini native API (`gemini-3-flash-preview`).
- **Extension build:** `BUILD_TARGET=extension npm run build` → `extension/app/assets/index.js`. Must run after any `src/` change.
- **Storage keys:** Currently `spoilershield-sessions`, `spoilershield-msgs-{id}`, `spoilershield_show_info`, `spoilershield_context`. All must migrate to `veil-*` / `veil_*` with backwards-compat read on first load.
- **Subtitle capture:** `content.js` already captures rolling subtitle lines into `chrome.storage.local` key `spoilershield_context` (renaming to `veil_context`). Not yet forwarded to chat.
- **Supabase project:** ref `dbileyqtnisyqzgwwive`. Secret: `GOOGLE_AI_API_KEY`.
- **Prior art:** All major bugs resolved. Product works end-to-end. This milestone is launch prep only.

## Constraints

- **Safety:** Do not weaken the spoiler safety contract (system prompt in `spoiler-shield-chat`)
- **Secrets:** All secrets stay in Supabase dashboard — never in repo
- **Refs:** `useRef` guards in `Index.tsx` and `useEpisodeRecap.ts` must not be removed (infinite-loop history)
- **Build:** Rebuild extension after every `src/` change
- **Dependencies:** Do not add new deps without documenting in PROJECT_CONTEXT.md Section 7

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Rebrand before Web Store submission | Name change post-submission means re-doing store listing, screenshots, privacy policy | — Pending |
| Subtitle context as positional hint only (~5 lines) | Full transcript is scope creep; model only needs to know where in the episode the user is | — Pending |
| Disable audit-answer pass | System prompt + classify-question are sufficient; audit adds latency and over-censors | ✓ Good |
| Chat-first UX (no wizard) | Removes friction; panel opens directly to chat | ✓ Good |
| Supabase KB for show context | Replaces client-side multi-API waterfall with O(1) cached lookup | ✓ Good |

---
*Last updated: 2026-03-19 after GSD initialization*
