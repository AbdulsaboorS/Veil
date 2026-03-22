---
phase: 3
slug: feedback-and-testing
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-22
---

# Phase 3 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest (config exists at `vitest.config.ts`; binary NOT installed — Wave 0 installs it) |
| **Config file** | `vitest.config.ts` + `src/test/setup.ts` |
| **Quick run command** | `npx vitest run --reporter=verbose` |
| **Full suite command** | `npx vitest run` |
| **Estimated runtime** | ~10 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run --reporter=verbose`
- **After every plan wave:** Run `npx vitest run`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** ~10 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| FBK-01a | 01 | 1 | FBK-01 | unit | `npx vitest run src/test/FeedbackDialog.test.tsx` | ❌ W0 | ⬜ pending |
| FBK-01b | 01 | 1 | FBK-01 | unit | `npx vitest run src/test/FeedbackDialog.test.tsx` | ❌ W0 | ⬜ pending |
| FBK-02a | 01 | 1 | FBK-02 | unit (fetch mock) | `npx vitest run src/test/submitFeedback.test.ts` | ❌ W0 | ⬜ pending |
| FBK-02b | 02 | 1 | FBK-02 | manual | n/a — verify via Supabase Studio | N/A | ⬜ pending |
| FBK-03a | 03 | 2 | FBK-03 | unit | `npx vitest run src/test/AdminPage.test.tsx` | ❌ W0 | ⬜ pending |
| FBK-03b | 03 | 2 | FBK-03 | unit | `npx vitest run src/test/AdminPage.test.tsx` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `src/test/FeedbackDialog.test.tsx` — stubs for FBK-01 (render trigger, open dialog, close dialog)
- [ ] `src/test/submitFeedback.test.ts` — stubs for FBK-02 (payload shape, fetch mock)
- [ ] `src/test/AdminPage.test.tsx` — stubs for FBK-03 (password gate render, unlock logic)
- [ ] Install test deps: `npm install --save-dev vitest @testing-library/react @testing-library/user-event jsdom`

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| `log-feedback` Edge Function inserts row into DB | FBK-02 | Requires live Supabase connection | Submit feedback from extension → open Supabase Studio → Table Editor → `feedback` table → confirm row with correct text, show, platform, episode, timestamp |
| Admin dashboard displays submitted feedback | FBK-03 | Requires live DB + Next.js route | Navigate to `/admin`, enter password, confirm table shows submitted rows |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
