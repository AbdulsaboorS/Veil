# Roadmap: Veil

## Overview

Veil is feature-complete. This milestone is launch prep: rename every SpoilerShield artifact to Veil, wire subtitle context into the chat pipeline so the model knows where in the episode the user is, add user feedback tooling, polish the landing page, then ship to the Chrome Web Store. Five phases, each delivering one coherent capability that unblocks the next.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3, 4, 5): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [x] **Phase 1: Rebrand** - All user-visible surfaces and storage say "Veil" — zero SpoilerShield remnants (completed 2026-03-20)
- [ ] **Phase 2: Subtitle Context** - Rolling subtitle lines flow into chat so the model knows where in the episode the user is
- [ ] **Phase 3: Feedback & Testing** - In-extension feedback submission, Supabase-backed storage, read-only admin dashboard
- [ ] **Phase 4: Landing Page** - Landing page copy, visual polish, and waitlist/signup flow
- [ ] **Phase 5: Web Store Launch** - Extension submitted to Chrome Web Store under the Veil brand

## Phase Details

### Phase 1: Rebrand
**Goal**: Users see "Veil" everywhere — in the UI, the extension manifest, and all storage keys — with no data loss on upgrade
**Depends on**: Nothing (first phase)
**Requirements**: REB-01, REB-02, REB-03, REB-04, REB-05, REB-06
**Success Criteria** (what must be TRUE):
  1. No text reading "SpoilerShield" or "Spoiler Shield" appears anywhere in the extension UI or Chrome extension management page
  2. Extension icon in the Chrome toolbar shows the Veil icon (veil-icon.svg)
  3. A user upgrading from a prior install retains all chat history and session data (localStorage keys migrated without data loss)
  4. postMessage communication between sidepanel, content.js, and React app uses VEIL_* message types without errors
**Plans**: 3 plans

Plans:
- [x] 01-01-PLAN.md — Rename extension layer: manifest name/description, chrome.storage keys (content.js + sidepanel.js), postMessage types (sidepanel.js), console prefixes, index.html title
- [x] 01-02-PLAN.md — Rename React src/ layer: localStorage key constants + migration, postMessage types (useInitFlow), custom DOM event, UI strings (Header, ShieldBadge), system prompt identity, test files
- [ ] 01-03-PLAN.md — Generate Veil PNG icons from veil-icon.svg, rebuild extension bundle, human verify icon and UI

### Phase 2: Subtitle Context
**Goal**: The chat model knows where in the episode the user currently is, via the rolling subtitle buffer captured by content.js
**Depends on**: Phase 1
**Requirements**: SUB-01, SUB-02, SUB-03
**Success Criteria** (what must be TRUE):
  1. After subtitles appear on screen, the active session's context field updates to include the current scene lines (within ~5 subtitle lines)
  2. The chat model response for a scene-specific question references the current scene content (not just the episode summary)
  3. Updating subtitle context does not trigger re-detection, session reset, or any visible UX disruption
**Plans**: 2 plans

Plans:
- [ ] 02-01-PLAN.md — Add VEIL_CONTEXT listener with debounce and context merge to useInitFlow.ts; rebuild extension bundle
- [ ] 02-02-PLAN.md — Human verify end-to-end subtitle pipeline: SUB-01 context field, SUB-02 model response, SUB-03 no re-detection

### Phase 3: Feedback & Testing
**Goal**: Users can submit feedback from within the extension; submissions land in Supabase; a read-only password-protected dashboard lets the owner review them
**Depends on**: Phase 2
**Requirements**: FBK-01, FBK-02, FBK-03
**Success Criteria** (what must be TRUE):
  1. A feedback entry point (button or menu item) is accessible from within the extension side panel
  2. Submitted feedback is stored in a Supabase table with timestamp, text, and optional metadata (show, platform)
  3. A read-only dashboard (hosted alongside the landing page) displays all submissions, protected by a simple password
**Plans**: TBD

### Phase 4: Landing Page
**Goal**: The Veil landing page is polished and ready for public traffic — updated copy, visual refinements, and a working waitlist/signup flow
**Depends on**: Phase 3
**Requirements**: LND-01, LND-02, LND-03
**Success Criteria** (what must be TRUE):
  1. Landing page copy reflects the Veil brand (no SpoilerShield references) and clearly communicates the product value
  2. Visual design is polished — consistent with extension UI, responsive on mobile and desktop
  3. A waitlist or signup CTA is functional and captures email addresses
**Plans**: TBD

### Phase 5: Web Store Launch
**Goal**: Veil is publicly available on the Chrome Web Store with a complete, policy-compliant store listing
**Depends on**: Phase 4
**Requirements**: STR-01, STR-02, STR-03, STR-04, STR-05
**Success Criteria** (what must be TRUE):
  1. Chrome Web Store listing shows "Veil" with a short description, detailed description, and correct category — visible to any Chrome user searching for it
  2. Store listing includes at least one 1280x800 or 640x400 screenshot showing the side panel in action
  3. A valid privacy policy URL is linked from the store listing (required to pass review)
  4. Extension installs from the store and passes the smoke test checklist (detect show, chat, spoiler block, session history)
**Plans**: TBD

## Progress

**Execution Order:**
Phases execute in numeric order: 1 → 2 → 3 → 4 → 5

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Rebrand | 3/3 | Complete   | 2026-03-20 |
| 2. Subtitle Context | 1/2 | In Progress|  |
| 3. Feedback & Testing | 0/? | Not started | - |
| 4. Landing Page | 0/? | Not started | - |
| 5. Web Store Launch | 0/? | Not started | - |
