# Deferred Items

Pre-existing test failures discovered during 03-01 execution (out of scope — not caused by this plan's changes).

## useInitFlow.test.ts — Infinite timer loop in jsdom (17 failing tests)

**File:** src/hooks/useInitFlow.test.ts
**Symptom:** "Aborting after running 10000 timers, assuming an infinite loop!" — triggered by `setInterval(requestShowInfo, 3000)` in useInitFlow.ts
**Root cause:** jsdom's fake timer handling — the poll interval set in useInitFlow is not cleared correctly in tests because `pollIdRef.current` cleanup requires the teardown hook to run, but jsdom fake timers exhaust before cleanup.
**Impact:** All useInitFlow integration tests fail. Feature code is unaffected.
**Suggested fix:** Add `vi.useFakeTimers()` + `vi.clearAllTimers()` in beforeEach/afterEach in useInitFlow.test.ts, or mock the setInterval/clearInterval calls.

## useSessionStore.test.ts — Session eviction test (1 failing test)

**File:** src/hooks/useSessionStore.test.ts
**Test:** "evicts the oldest session when the 10-session limit is reached"
**Symptom:** `expected '[]' to be null` — evicted session's messages key is set to '[]' instead of null after eviction.
**Root cause:** Session eviction deletes the messages but localStorage mock returns '[]' (empty array stringified) instead of null.
**Suggested fix:** Update eviction logic in useSessionStore to use `localStorage.removeItem` (not `setItem(key, '[]')`) when clearing evicted session messages.
