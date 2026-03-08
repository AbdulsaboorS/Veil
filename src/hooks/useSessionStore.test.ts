/**
 * useSessionStore.test.ts
 *
 * Coverage plan:
 *   - makeSessionId: showId-based vs slug-based identifiers
 *   - loadOrCreateSession: creates new session, deduplicates existing, evicts oldest at limit
 *   - updateContext with no explicitSessionId (reads activeSessionIdRef)
 *   - updateContext WITH explicitSessionId (bypasses stale ref — the key fix)
 *   - updateContext when no active session → no-op
 *   - Legacy migration: old `spoilershield-chat` messages → `legacy-session`
 *   - switchSession: updates active id and writes to localStorage
 *   - deleteSession: removes messages key, falls back to next session
 *   - getMessagesKey: returns correct prefix
 *   - confirmedSessions: only exposes sessions where confirmed !== false
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useSessionStore, makeSessionId } from './useSessionStore';

// ─── helpers ─────────────────────────────────────────────────────────────────

const SESSIONS_KEY = 'spoilershield-sessions';
const ACTIVE_SESSION_KEY = 'spoilershield-active-session';
const MESSAGES_PREFIX = 'spoilershield-msgs-';

function writeSessions(sessions: object[]) {
  window.localStorage.setItem(SESSIONS_KEY, JSON.stringify(sessions));
}

function makeSession(overrides: Record<string, unknown> = {}) {
  return {
    sessionId: 'test-s1e1',
    showId: 1,
    showTitle: 'Test Show',
    platform: 'crunchyroll',
    season: '1',
    episode: '1',
    context: '',
    lastMessageAt: Date.now(),
    messageCount: 0,
    confirmed: true,
    ...overrides,
  };
}

// ─── makeSessionId ────────────────────────────────────────────────────────────

describe('makeSessionId', () => {
  it('uses showId as prefix when showId is provided', () => {
    expect(makeSessionId(42, 'Some Show', '1', '4')).toBe('42-s1e4');
  });

  it('uses slugified showTitle when showId is undefined', () => {
    expect(makeSessionId(undefined, 'Jujutsu Kaisen', '2', '3')).toBe('jujutsu-kaisen-s2e3');
  });

  it('collapses special characters in slug', () => {
    // Symbols other than a-z0-9 become hyphens, leading/trailing hyphens stripped.
    const id = makeSessionId(undefined, 'Re:Zero', '1', '1');
    expect(id).toMatch(/^re-zero-s1e1$/);
  });

  it('handles empty season and episode strings', () => {
    expect(makeSessionId(7, 'Attack on Titan', '', '')).toBe('7-se');
  });
});

// ─── loadOrCreateSession ─────────────────────────────────────────────────────

describe('useSessionStore — loadOrCreateSession', () => {
  it('creates a new session and returns its id', () => {
    const { result } = renderHook(() => useSessionStore());

    let sessionId: string;
    act(() => {
      sessionId = result.current.loadOrCreateSession('My Show', 99, 'crunchyroll', '1', '2');
    });

    expect(sessionId!).toBe('99-s1e2');
    expect(result.current.activeSessionId).toBe('99-s1e2');
  });

  it('persists the new session to localStorage', () => {
    const { result } = renderHook(() => useSessionStore());

    act(() => {
      result.current.loadOrCreateSession('My Show', 99, 'crunchyroll', '1', '2');
    });

    const stored = JSON.parse(window.localStorage.getItem(SESSIONS_KEY)!);
    expect(stored).toHaveLength(1);
    expect(stored[0].sessionId).toBe('99-s1e2');
    expect(stored[0].showTitle).toBe('My Show');
  });

  it('returns the same session id without duplicating when session already exists', () => {
    writeSessions([makeSession({ sessionId: '99-s1e2', showId: 99, showTitle: 'My Show' })]);

    const { result } = renderHook(() => useSessionStore());

    act(() => {
      result.current.loadOrCreateSession('My Show', 99, 'crunchyroll', '1', '2');
    });

    const stored = JSON.parse(window.localStorage.getItem(SESSIONS_KEY)!);
    expect(stored).toHaveLength(1);
  });

  it('evicts the oldest session when the 10-session limit is reached', () => {
    const sessions = Array.from({ length: 10 }, (_, i) => ({
      sessionId: `show-s1e${i + 1}`,
      showId: i,
      showTitle: `Show ${i}`,
      platform: 'crunchyroll',
      season: '1',
      episode: String(i + 1),
      context: '',
      lastMessageAt: Date.now() - (10 - i) * 1000,
      messageCount: 0,
      confirmed: true,
    }));
    writeSessions(sessions);
    // Also write a messages key for the session that will be evicted (last in array → oldest).
    window.localStorage.setItem(`${MESSAGES_PREFIX}show-s1e1`, JSON.stringify([]));

    const { result } = renderHook(() => useSessionStore());

    act(() => {
      result.current.loadOrCreateSession('New Show', 100, 'crunchyroll', '2', '1');
    });

    const stored = JSON.parse(window.localStorage.getItem(SESSIONS_KEY)!);
    expect(stored).toHaveLength(10);
    // Newest session is at the front.
    expect(stored[0].sessionId).toBe('100-s2e1');
    // Evicted session's messages key should be gone.
    expect(window.localStorage.getItem(`${MESSAGES_PREFIX}show-s1e1`)).toBeNull();
  });
});

// ─── updateContext — the stale-ref bypass ─────────────────────────────────────

describe('useSessionStore — updateContext', () => {
  it('updates context of the active session when no explicitSessionId given', () => {
    const session = makeSession({ sessionId: '5-s1e1', context: '' });
    writeSessions([session]);
    window.localStorage.setItem(ACTIVE_SESSION_KEY, '5-s1e1');

    const { result } = renderHook(() => useSessionStore());

    act(() => {
      result.current.updateContext('Some episode summary');
    });

    const stored = JSON.parse(window.localStorage.getItem(SESSIONS_KEY)!);
    expect(stored[0].context).toBe('Some episode summary');
  });

  it('updates context of the explicitly-supplied session even when activeSessionId differs', () => {
    // This is the stale-ref bypass: useInitFlow calls updateContext(summary, sessionId)
    // immediately after loadOrCreateSession, before React re-renders. Without the
    // explicitSessionId param, activeSessionIdRef would still hold the OLD session.
    const sessions = [
      makeSession({ sessionId: 'old-session', context: 'old context' }),
      makeSession({ sessionId: 'new-s1e5', showId: 5, context: '' }),
    ];
    writeSessions(sessions);
    // Active session is still the old one (simulates stale closure scenario).
    window.localStorage.setItem(ACTIVE_SESSION_KEY, 'old-session');

    const { result } = renderHook(() => useSessionStore());

    act(() => {
      // Explicitly target new-s1e5, bypassing the stale activeSessionId.
      result.current.updateContext('[Show overview] Great show', 'new-s1e5');
    });

    const stored = JSON.parse(window.localStorage.getItem(SESSIONS_KEY)!);
    const oldSession = stored.find((s: { sessionId: string }) => s.sessionId === 'old-session');
    const newSession = stored.find((s: { sessionId: string }) => s.sessionId === 'new-s1e5');

    // Only the targeted session should be updated.
    expect(newSession.context).toBe('[Show overview] Great show');
    // The old session must NOT be touched.
    expect(oldSession.context).toBe('old context');
  });

  it('is a no-op when no active session and no explicitSessionId', () => {
    // No ACTIVE_SESSION_KEY written and no sessions in localStorage.
    const { result } = renderHook(() => useSessionStore());

    // Should not throw and sessions should remain empty.
    act(() => {
      result.current.updateContext('context that should not be stored');
    });

    expect(result.current.sessions).toHaveLength(0);
  });

  it('writes the updated context to localStorage', () => {
    const session = makeSession({ sessionId: '7-s2e3', context: '' });
    writeSessions([session]);
    window.localStorage.setItem(ACTIVE_SESSION_KEY, '7-s2e3');

    const { result } = renderHook(() => useSessionStore());

    act(() => {
      result.current.updateContext('recap text', '7-s2e3');
    });

    const stored = JSON.parse(window.localStorage.getItem(SESSIONS_KEY)!);
    expect(stored[0].context).toBe('recap text');
  });

  it('does not modify other sessions when targeting one by explicitSessionId', () => {
    const sessions = [
      makeSession({ sessionId: 'a-s1e1', context: 'context A' }),
      makeSession({ sessionId: 'b-s1e2', context: 'context B' }),
      makeSession({ sessionId: 'c-s1e3', context: 'context C' }),
    ];
    writeSessions(sessions);
    window.localStorage.setItem(ACTIVE_SESSION_KEY, 'a-s1e1');

    const { result } = renderHook(() => useSessionStore());

    act(() => {
      result.current.updateContext('new context B', 'b-s1e2');
    });

    const stored = JSON.parse(window.localStorage.getItem(SESSIONS_KEY)!);
    const byId = Object.fromEntries(stored.map((s: { sessionId: string; context: string }) => [s.sessionId, s.context]));
    expect(byId['a-s1e1']).toBe('context A');
    expect(byId['b-s1e2']).toBe('new context B');
    expect(byId['c-s1e3']).toBe('context C');
  });
});

// ─── Legacy migration ─────────────────────────────────────────────────────────

describe('useSessionStore — legacy migration', () => {
  it('migrates messages from spoilershield-chat to legacy-session on first load', () => {
    const legacyMessages = [
      { id: '1', role: 'user', content: 'Hello', timestamp: new Date().toISOString() },
    ];
    window.localStorage.setItem('spoilershield-chat', JSON.stringify(legacyMessages));

    const { result } = renderHook(() => useSessionStore());

    // A legacy-session should have been created.
    const legacySession = result.current.sessions.find(s => s.sessionId === 'legacy-session');
    expect(legacySession).toBeDefined();
    expect(legacySession?.showTitle).toBe('Previous conversation');

    // Legacy messages should be accessible under the new prefix key.
    const migratedRaw = window.localStorage.getItem(`${MESSAGES_PREFIX}legacy-session`);
    expect(migratedRaw).not.toBeNull();
    const migrated = JSON.parse(migratedRaw!);
    expect(migrated).toHaveLength(1);
    expect(migrated[0].content).toBe('Hello');
  });

  it('does not perform migration when spoilershield-sessions already exists', () => {
    const existing = [makeSession()];
    writeSessions(existing);
    window.localStorage.setItem('spoilershield-chat', JSON.stringify([
      { id: '1', role: 'user', content: 'old message', timestamp: new Date().toISOString() },
    ]));

    const { result } = renderHook(() => useSessionStore());

    // No legacy-session should appear — existing sessions are used as-is.
    const legacySession = result.current.sessions.find(s => s.sessionId === 'legacy-session');
    expect(legacySession).toBeUndefined();
    expect(result.current.sessions).toHaveLength(1);
  });

  it('returns empty sessions when no legacy data exists', () => {
    const { result } = renderHook(() => useSessionStore());
    expect(result.current.sessions).toHaveLength(0);
  });
});

// ─── switchSession ────────────────────────────────────────────────────────────

describe('useSessionStore — switchSession', () => {
  it('updates activeSessionId and persists it to localStorage', () => {
    const sessions = [
      makeSession({ sessionId: 'sess-a' }),
      makeSession({ sessionId: 'sess-b' }),
    ];
    writeSessions(sessions);
    window.localStorage.setItem(ACTIVE_SESSION_KEY, 'sess-a');

    const { result } = renderHook(() => useSessionStore());

    act(() => {
      result.current.switchSession('sess-b');
    });

    expect(result.current.activeSessionId).toBe('sess-b');
    expect(window.localStorage.getItem(ACTIVE_SESSION_KEY)).toBe('sess-b');
  });
});

// ─── deleteSession ────────────────────────────────────────────────────────────

describe('useSessionStore — deleteSession', () => {
  it('removes the session from state and its messages from localStorage', () => {
    const sessions = [makeSession({ sessionId: 'doomed-s1e1' })];
    writeSessions(sessions);
    window.localStorage.setItem(`${MESSAGES_PREFIX}doomed-s1e1`, JSON.stringify([]));

    const { result } = renderHook(() => useSessionStore());

    act(() => {
      result.current.deleteSession('doomed-s1e1');
    });

    expect(result.current.sessions).toHaveLength(0);
    expect(window.localStorage.getItem(`${MESSAGES_PREFIX}doomed-s1e1`)).toBeNull();
  });

  it('falls back active session to the next remaining session', () => {
    const sessions = [
      makeSession({ sessionId: 'active-sess' }),
      makeSession({ sessionId: 'next-sess' }),
    ];
    writeSessions(sessions);
    window.localStorage.setItem(ACTIVE_SESSION_KEY, 'active-sess');

    const { result } = renderHook(() => useSessionStore());

    act(() => {
      result.current.deleteSession('active-sess');
    });

    // After deleting the active session, the next available one should become active.
    expect(result.current.activeSessionId).toBe('next-sess');
  });

  it('clears activeSessionId when the last session is deleted', () => {
    const sessions = [makeSession({ sessionId: 'only-sess' })];
    writeSessions(sessions);
    window.localStorage.setItem(ACTIVE_SESSION_KEY, 'only-sess');

    const { result } = renderHook(() => useSessionStore());

    act(() => {
      result.current.deleteSession('only-sess');
    });

    expect(result.current.activeSessionId).toBeNull();
    expect(window.localStorage.getItem(ACTIVE_SESSION_KEY)).toBeNull();
  });
});

// ─── getMessagesKey ───────────────────────────────────────────────────────────

describe('useSessionStore — getMessagesKey', () => {
  it('returns the correct prefixed key', () => {
    const { result } = renderHook(() => useSessionStore());
    expect(result.current.getMessagesKey('42-s1e5')).toBe(`${MESSAGES_PREFIX}42-s1e5`);
  });
});

// ─── confirmedSessions ────────────────────────────────────────────────────────

describe('useSessionStore — confirmedSessions', () => {
  it('excludes sessions where confirmed is false', () => {
    const sessions = [
      makeSession({ sessionId: 'a', confirmed: true }),
      makeSession({ sessionId: 'b', confirmed: false }),
      makeSession({ sessionId: 'c', confirmed: true }),
    ];
    writeSessions(sessions);

    const { result } = renderHook(() => useSessionStore());

    expect(result.current.confirmedSessions).toHaveLength(2);
    expect(result.current.confirmedSessions.map(s => s.sessionId)).toEqual(['a', 'c']);
  });

  it('includes sessions where confirmed is undefined (treated as confirmed)', () => {
    // confirmed?: boolean — undefined is falsy but the filter is confirmed !== false,
    // so undefined sessions ARE included.
    const sessions = [makeSession({ sessionId: 'no-flag', confirmed: undefined })];
    writeSessions(sessions);

    const { result } = renderHook(() => useSessionStore());

    expect(result.current.confirmedSessions).toHaveLength(1);
  });
});
