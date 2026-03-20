# Requirements: Veil

**Defined:** 2026-03-19
**Core Value:** The user can ask anything about what they're watching and get a real, helpful answer that never spoils what's coming next.

## v1 Requirements

Requirements for v1 Launch milestone.

### Rebrand

- [ ] **REB-01**: All user-visible UI strings show "Veil" — no "SpoilerShield" visible anywhere in the extension
- [x] **REB-02**: Extension manifest name, short_name, and description updated to Veil
- [ ] **REB-03**: localStorage keys migrated from `spoilershield-*` to `veil-*` with backwards-compat read on first load (no data loss)
- [x] **REB-04**: chrome.storage.local keys migrated from `spoilershield_*` to `veil_*` in content.js and sidepanel.js
- [x] **REB-05**: postMessage types updated from `SPOILERSHIELD_*` to `VEIL_*` across content.js, sidepanel.js, and React app
- [ ] **REB-06**: Extension icon updated to Veil icon (veil-icon.svg already exists at `extension/icons/`)

### Subtitle Context

- [ ] **SUB-01**: Subtitle lines captured by content.js (rolling buffer, ~5 lines) are forwarded to the session's context field when updated
- [ ] **SUB-02**: Chat edge function (`spoiler-shield-chat`) accepts and uses a labeled subtitle section in context (e.g. `CURRENT SCENE:`) so the model knows where in the episode the user is
- [ ] **SUB-03**: Subtitle context does not cause re-detection or session reset when updated

### Web Store

- [ ] **STR-01**: Chrome Web Store listing created with Veil name, description (short + detailed), and category
- [ ] **STR-02**: Store screenshots provided (1280×800 or 640×400) showing side panel in action
- [ ] **STR-03**: Privacy policy URL provided (required for store review)
- [ ] **STR-04**: manifest.json version bumped to 1.0.0 and permissions audited (no over-requesting)
- [ ] **STR-05**: Extension submitted for Chrome Web Store review

## v2 Requirements

### Netflix Fixes

- **NFX-01**: Netflix SPA navigation (Next Episode button) triggers re-detection
- **NFX-02**: Netflix movie pages scraped correctly (no infinite Detecting loop)
- **NFX-03**: `id_mappings` table stores season/episode for O(1) episode-level Netflix lookup

### Extended Coverage

- **EXT-01**: Crunchyroll subtitle context wired for non-Crunchyroll platforms (currently Crunchyroll-only)
- **EXT-02**: Crunchyroll movie support (needs-episode path resolved for movies)

## Out of Scope

| Feature | Reason |
|---------|--------|
| Audit pass (audit-answer) | System prompt + classify-question sufficient; adds latency and over-censors |
| Full subtitle transcript | Scope creep; rolling 5-line buffer is the right positional hint |
| iOS / Android app | Web/extension first |
| Multi-browser support (Firefox, Safari) | Chrome MV3 only for v1 |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| REB-01 | Phase 1 | Pending |
| REB-02 | Phase 1 | Complete |
| REB-03 | Phase 1 | Pending |
| REB-04 | Phase 1 | Complete |
| REB-05 | Phase 1 | Complete |
| REB-06 | Phase 1 | Pending |
| SUB-01 | Phase 2 | Pending |
| SUB-02 | Phase 2 | Pending |
| SUB-03 | Phase 2 | Pending |
| STR-01 | Phase 3 | Pending |
| STR-02 | Phase 3 | Pending |
| STR-03 | Phase 3 | Pending |
| STR-04 | Phase 3 | Pending |
| STR-05 | Phase 3 | Pending |

**Coverage:**
- v1 requirements: 14 total
- Mapped to phases: 14
- Unmapped: 0 ✓

---
*Requirements defined: 2026-03-19*
*Last updated: 2026-03-19 — traceability confirmed against ROADMAP.md*
