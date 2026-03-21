---
phase: 2
slug: subtitle-context
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-21
---

# Phase 2 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Manual (no automated test framework active for extension layer) |
| **Config file** | None |
| **Quick run command** | `JSON.parse(localStorage.getItem('veil-sessions')).find(s => s.sessionId === localStorage.getItem('veil-active-session'))?.context` — inspect in DevTools console |
| **Full suite command** | Run CLAUDE.md Section 6 smoke test checklist |
| **Estimated runtime** | ~5 minutes manual |

---

## Sampling Rate

- **After every task commit:** Check `veil-sessions` localStorage key for `CURRENT SCENE:` block presence via DevTools console
- **After every plan wave:** Full smoke test checklist (CLAUDE.md Section 6)
- **Before `/gsd:verify-work`:** All three SUB requirements pass manual verification
- **Max feedback latency:** ~5 minutes

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 2-01-01 | 01 | 1 | SUB-01, SUB-03 | manual | DevTools: inspect `veil-sessions` context field for `CURRENT SCENE:` block; watch console for no phase transitions | N/A | ⬜ pending |
| 2-01-02 | 01 | 1 | SUB-02 | manual | Ask "What is happening right now?" while subtitles show a specific action; verify model references that action | N/A | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

None — no automated test infrastructure. Existing manual smoke test checklist covers all phase requirements.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Subtitle lines appear in session context within ~5 lines | SUB-01 | Extension layer; no test harness for chrome.storage | Open DevTools on a Crunchyroll episode with subtitles. Run: `JSON.parse(localStorage.getItem('veil-sessions')).find(s => s.sessionId === localStorage.getItem('veil-active-session'))?.context` — confirm `CURRENT SCENE:` block is present |
| Chat response references current scene | SUB-02 | LLM behavior; requires live Gemini call | While subtitles are on screen, ask "What is happening right now?" in Veil. Verify model references the subtitle content, not just the episode recap |
| Context update does not trigger re-detection | SUB-03 | Extension state machine; no unit test harness | Watch DevTools console while subtitles update. Confirm no `[Veil] phase:` transitions to `detecting` or `resolving` after initial `ready` state |

---

## Validation Sign-Off

- [ ] All tasks have manual verify instructions
- [ ] Sampling continuity: per-task check defined
- [ ] No automated gaps (Wave 0 not needed)
- [ ] No watch-mode flags
- [ ] Feedback latency < 5 min
- [ ] `nyquist_compliant: true` set in frontmatter when all manual checks pass

**Approval:** pending
