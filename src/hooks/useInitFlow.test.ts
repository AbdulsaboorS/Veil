/**
 * useInitFlow.test.ts
 *
 * Coverage plan:
 *   Netflix dedup key (the key change in this session):
 *     - Netflix platform: key is `showTitle|pathname`, not `showTitle|season|episode`
 *     - Non-Netflix platform: key is `showTitle|season|episode`
 *     - Duplicate message with same Netflix key is ignored (phase stays at 'ready')
 *     - Different Netflix URL path → treated as new show/page, re-processes
 *     - Netflix URL present but empty episodeInfo → still uses pathname key
 *
 *   updateContext with sessionId (Netflix no-episode branch):
 *     - When Netflix show has a TVMaze summary, updateContext is called with (summary, sessionId)
 *     - When Netflix show has no TVMaze summary, updateContext is NOT called
 *
 *   Phase transitions triggered by window.postMessage:
 *     - No-title message (non-Netflix) → 'no-show' if we were on a show
 *     - Valid show message → 'resolving' then 'ready' (with episode) or 'needs-episode' (without)
 *     - Netflix without episode info → 'ready' (not 'needs-episode')
 *     - Detection timeout → 'no-show'
 *
 * Strategy:
 *   useInitFlow depends on useSidePanel, useEpisodeRecap, useSessionStore, and toast.
 *   We mock all four at the module level so tests only exercise useInitFlow logic.
 *   We also mock fetch (TVMaze search endpoint).
 */

import { describe, it, expect, beforeEach, vi, type MockedFunction } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useInitFlow } from './useInitFlow';

// ─── module mocks ─────────────────────────────────────────────────────────────

// useSidePanel: return true so the message listener is registered.
vi.mock('./useSidePanel', () => ({
  useSidePanel: () => true,
}));

// useEpisodeRecap: provide a controllable fetchRecap stub.
const mockFetchRecap = vi.fn().mockResolvedValue({ summary: null, source: null });
vi.mock('./useEpisodeRecap', () => ({
  useEpisodeRecap: () => ({ fetchRecap: mockFetchRecap }),
}));

// toast: silence it in tests.
vi.mock('@/components/ui/sonner', () => ({
  toast: vi.fn(),
}));

// ─── fetch mock (TVMaze search) ───────────────────────────────────────────────

const mockFetch = vi.fn() as MockedFunction<typeof fetch>;

function makeJsonResponse(body: unknown, ok = true): Response {
  return {
    ok,
    status: ok ? 200 : 500,
    json: async () => body,
  } as unknown as Response;
}

// A TVMaze search result for a generic show.
function tvmazeSearchResult(name = 'Attack on Titan', id = 42, summary = '<p>Great show.</p>') {
  return [{ show: { id, name, summary } }];
}

// A TVMaze result with no summary.
function tvmazeSearchResultNoSummary(name = 'Netflix Show', id = 77) {
  return [{ show: { id, name, summary: null } }];
}

// ─── sessionStore mock factory ────────────────────────────────────────────────
// Each test creates a fresh mock so they don't share state.

function makeSessionStoreMock(overrides: Partial<{
  loadOrCreateSession: (title: string, id: number | undefined, platform: string, season: string, episode: string) => string;
  updateContext: (context: string, sessionId?: string) => void;
  sessions: unknown[];
}> = {}) {
  return {
    sessions: [],
    confirmedSessions: [],
    activeSession: null,
    activeSessionId: null,
    loadOrCreateSession: vi.fn().mockReturnValue('mock-session-id'),
    switchSession: vi.fn(),
    deleteSession: vi.fn(),
    updateContext: vi.fn(),
    updateEpisode: vi.fn(),
    syncMessageCount: vi.fn(),
    getMessagesKey: vi.fn((id: string) => `veil-msgs-${id}`),
    ...overrides,
  };
}

// ─── helpers ──────────────────────────────────────────────────────────────────

function sendShowInfo(payload: Record<string, unknown>) {
  window.dispatchEvent(
    new MessageEvent('message', {
      data: { type: 'VEIL_SHOW_INFO', payload },
      origin: window.location.origin,
    })
  );
}

// ─── beforeEach ───────────────────────────────────────────────────────────────

beforeEach(() => {
  global.fetch = mockFetch;
  mockFetch.mockReset();
  mockFetchRecap.mockReset();
  mockFetchRecap.mockResolvedValue({ summary: null, source: null });
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

// ─── Netflix dedup key — pathname-based ───────────────────────────────────────

describe('useInitFlow — Netflix dedup key', () => {
  it('uses URL pathname as key for Netflix (not season/episode)', async () => {
    const sessionStore = makeSessionStoreMock();
    const { result } = renderHook(() => useInitFlow(sessionStore as ReturnType<typeof import('./useSessionStore').useSessionStore>));

    mockFetch.mockResolvedValueOnce(makeJsonResponse(tvmazeSearchResult('My Hero Academia', 100)));

    // First message: send Netflix show info without episode data.
    await act(async () => {
      sendShowInfo({
        platform: 'netflix',
        showTitle: 'My Hero Academia',
        url: 'https://www.netflix.com/watch/12345',
      });
      await vi.runAllTimersAsync();
    });

    await waitFor(() => {
      expect(result.current.phase).toBe('ready');
    });

    // TVMaze lookup should have been called once.
    expect(mockFetch).toHaveBeenCalledTimes(1);

    // Second message: same pathname → deduplicated, no new lookup.
    mockFetch.mockClear();
    await act(async () => {
      sendShowInfo({
        platform: 'netflix',
        showTitle: 'My Hero Academia',
        url: 'https://www.netflix.com/watch/12345', // same path
      });
      await vi.runAllTimersAsync();
    });

    // No new fetch calls — message was deduped.
    expect(mockFetch).toHaveBeenCalledTimes(0);
  });

  it('re-processes when Netflix URL pathname changes (navigation)', async () => {
    const sessionStore = makeSessionStoreMock();
    const { result } = renderHook(() => useInitFlow(sessionStore as ReturnType<typeof import('./useSessionStore').useSessionStore>));

    mockFetch
      .mockResolvedValueOnce(makeJsonResponse(tvmazeSearchResult('My Hero Academia', 100))) // first
      .mockResolvedValueOnce(makeJsonResponse(tvmazeSearchResult('My Hero Academia', 100))); // second

    // First navigation.
    await act(async () => {
      sendShowInfo({
        platform: 'netflix',
        showTitle: 'My Hero Academia',
        url: 'https://www.netflix.com/watch/12345',
      });
      await vi.runAllTimersAsync();
    });

    await waitFor(() => expect(result.current.phase).toBe('ready'));

    const firstCallCount = mockFetch.mock.calls.length;

    // Navigate to a different Netflix page (different path).
    await act(async () => {
      sendShowInfo({
        platform: 'netflix',
        showTitle: 'My Hero Academia',
        url: 'https://www.netflix.com/watch/99999', // different path
      });
      await vi.runAllTimersAsync();
    });

    // A new TVMaze call should have been made for the new path.
    expect(mockFetch.mock.calls.length).toBeGreaterThan(firstCallCount);
  });

  it('non-Netflix platform uses showTitle|season|episode as dedup key', async () => {
    const sessionStore = makeSessionStoreMock();
    const { result } = renderHook(() => useInitFlow(sessionStore as ReturnType<typeof import('./useSessionStore').useSessionStore>));

    mockFetch.mockResolvedValueOnce(makeJsonResponse(tvmazeSearchResult('Attack on Titan', 42)));

    await act(async () => {
      sendShowInfo({
        platform: 'crunchyroll',
        showTitle: 'Attack on Titan',
        episodeInfo: { season: '1', episode: '1' },
      });
      await vi.runAllTimersAsync();
    });

    await waitFor(() => expect(result.current.phase).toBe('ready'));

    mockFetch.mockClear();

    // Same show + same episode → deduped.
    await act(async () => {
      sendShowInfo({
        platform: 'crunchyroll',
        showTitle: 'Attack on Titan',
        episodeInfo: { season: '1', episode: '1' },
      });
      await vi.runAllTimersAsync();
    });

    expect(mockFetch).toHaveBeenCalledTimes(0);
  });

  it('non-Netflix platform re-processes when episode number changes', async () => {
    const sessionStore = makeSessionStoreMock();
    renderHook(() => useInitFlow(sessionStore as ReturnType<typeof import('./useSessionStore').useSessionStore>));

    mockFetch
      .mockResolvedValueOnce(makeJsonResponse(tvmazeSearchResult('Attack on Titan', 42)))
      .mockResolvedValueOnce(makeJsonResponse(tvmazeSearchResult('Attack on Titan', 42)));

    await act(async () => {
      sendShowInfo({
        platform: 'crunchyroll',
        showTitle: 'Attack on Titan',
        episodeInfo: { season: '1', episode: '1' },
      });
      await vi.runAllTimersAsync();
    });

    const firstCount = mockFetch.mock.calls.length;

    await act(async () => {
      sendShowInfo({
        platform: 'crunchyroll',
        showTitle: 'Attack on Titan',
        episodeInfo: { season: '1', episode: '2' }, // new episode
      });
      await vi.runAllTimersAsync();
    });

    expect(mockFetch.mock.calls.length).toBeGreaterThan(firstCount);
  });

  it('Netflix message with no URL uses empty-string pathname key', async () => {
    const sessionStore = makeSessionStoreMock();
    renderHook(() => useInitFlow(sessionStore as ReturnType<typeof import('./useSessionStore').useSessionStore>));

    mockFetch.mockResolvedValueOnce(makeJsonResponse(tvmazeSearchResult('Some Show', 5)));

    await act(async () => {
      sendShowInfo({
        platform: 'netflix',
        showTitle: 'Some Show',
        // url intentionally absent
      });
      await vi.runAllTimersAsync();
    });

    // Should not throw; TVMaze lookup fires once.
    expect(mockFetch).toHaveBeenCalledTimes(1);

    // Sending again with same absent url → deduped.
    mockFetch.mockClear();
    await act(async () => {
      sendShowInfo({ platform: 'netflix', showTitle: 'Some Show' });
      await vi.runAllTimersAsync();
    });
    expect(mockFetch).toHaveBeenCalledTimes(0);
  });
});

// ─── updateContext with sessionId (Netflix no-episode branch) ─────────────────

describe('useInitFlow — updateContext called with sessionId on Netflix no-episode branch', () => {
  it('calls updateContext(summary, sessionId) when Netflix show has a TVMaze summary', async () => {
    const sessionStore = makeSessionStoreMock({
      loadOrCreateSession: vi.fn().mockReturnValue('netflix-session-id'),
    });

    window.localStorage.setItem(
      'veil-sessions',
      JSON.stringify([{
        sessionId: 'netflix-session-id',
        showTitle: 'My Hero Academia',
        platform: 'netflix',
        season: '',
        episode: '',
        context: '', // empty — so updateContext should be called
        lastMessageAt: Date.now(),
        messageCount: 0,
        confirmed: false,
      }])
    );

    renderHook(() => useInitFlow(sessionStore as ReturnType<typeof import('./useSessionStore').useSessionStore>));

    mockFetch.mockResolvedValueOnce(
      makeJsonResponse(tvmazeSearchResult('My Hero Academia', 100, '<p>Young heroes.</p>'))
    );

    await act(async () => {
      sendShowInfo({
        platform: 'netflix',
        showTitle: 'My Hero Academia',
        url: 'https://www.netflix.com/watch/80218879',
      });
      await vi.runAllTimersAsync();
    });

    await waitFor(() => {
      expect(sessionStore.updateContext).toHaveBeenCalled();
    });

    const [contextArg, sessionIdArg] = (sessionStore.updateContext as ReturnType<typeof vi.fn>).mock.calls[0];
    // The context arg should wrap the summary with [Show overview].
    expect(contextArg).toContain('[Show overview]');
    expect(contextArg).toContain('Young heroes.');
    // The session id must be explicitly passed (this is the fix — avoids stale closure).
    expect(sessionIdArg).toBe('netflix-session-id');
  });

  it('does NOT call updateContext when Netflix show has no TVMaze summary', async () => {
    const sessionStore = makeSessionStoreMock({
      loadOrCreateSession: vi.fn().mockReturnValue('netflix-no-summary-id'),
    });

    window.localStorage.setItem(
      'veil-sessions',
      JSON.stringify([{
        sessionId: 'netflix-no-summary-id',
        showTitle: 'Obscure Anime',
        platform: 'netflix',
        season: '',
        episode: '',
        context: '',
        lastMessageAt: Date.now(),
        messageCount: 0,
        confirmed: false,
      }])
    );

    renderHook(() => useInitFlow(sessionStore as ReturnType<typeof import('./useSessionStore').useSessionStore>));

    // TVMaze returns a result but no summary.
    mockFetch.mockResolvedValueOnce(makeJsonResponse(tvmazeSearchResultNoSummary('Obscure Anime', 999)));

    await act(async () => {
      sendShowInfo({
        platform: 'netflix',
        showTitle: 'Obscure Anime',
        url: 'https://www.netflix.com/watch/55555',
      });
      await vi.runAllTimersAsync();
    });

    // Give time for the async TVMaze call to complete.
    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalled();
    });

    // updateContext should NOT have been called.
    expect(sessionStore.updateContext).not.toHaveBeenCalled();
  });

  it('does NOT call updateContext when Netflix session already has context', async () => {
    const sessionStore = makeSessionStoreMock({
      loadOrCreateSession: vi.fn().mockReturnValue('netflix-existing-ctx'),
    });

    // Session already has context — should not overwrite.
    window.localStorage.setItem(
      'veil-sessions',
      JSON.stringify([{
        sessionId: 'netflix-existing-ctx',
        showTitle: 'Dragon Ball Z',
        platform: 'netflix',
        season: '',
        episode: '',
        context: '[Show overview] Already populated context.',
        lastMessageAt: Date.now(),
        messageCount: 0,
        confirmed: true,
      }])
    );

    renderHook(() => useInitFlow(sessionStore as ReturnType<typeof import('./useSessionStore').useSessionStore>));

    mockFetch.mockResolvedValueOnce(
      makeJsonResponse(tvmazeSearchResult('Dragon Ball Z', 7, '<p>Saiyans arrive.</p>'))
    );

    await act(async () => {
      sendShowInfo({
        platform: 'netflix',
        showTitle: 'Dragon Ball Z',
        url: 'https://www.netflix.com/watch/70111470',
      });
      await vi.runAllTimersAsync();
    });

    await waitFor(() => expect(mockFetch).toHaveBeenCalled());

    expect(sessionStore.updateContext).not.toHaveBeenCalled();
  });
});

// ─── Phase transitions ────────────────────────────────────────────────────────

describe('useInitFlow — phase transitions', () => {
  it('transitions to no-show after timeout when no show info arrives', async () => {
    const sessionStore = makeSessionStoreMock();
    const { result } = renderHook(() => useInitFlow(sessionStore as ReturnType<typeof import('./useSessionStore').useSessionStore>));

    expect(result.current.phase).toBe('detecting');

    await act(async () => {
      vi.advanceTimersByTime(2500); // past the 2000ms NO_SHOW_TIMEOUT_MS
    });

    expect(result.current.phase).toBe('no-show');
  });

  it('transitions to resolving then ready for a non-Netflix show with episode', async () => {
    const sessionStore = makeSessionStoreMock();
    const { result } = renderHook(() => useInitFlow(sessionStore as ReturnType<typeof import('./useSessionStore').useSessionStore>));

    mockFetch.mockResolvedValueOnce(makeJsonResponse(tvmazeSearchResult('Demon Slayer', 55)));

    await act(async () => {
      sendShowInfo({
        platform: 'crunchyroll',
        showTitle: 'Demon Slayer',
        episodeInfo: { season: '1', episode: '1' },
      });
      await vi.runAllTimersAsync();
    });

    await waitFor(() => expect(result.current.phase).toBe('ready'));
    expect(result.current.detectedShowInfo?.showTitle).toBe('Demon Slayer');
  });

  it('transitions to needs-episode for a non-Netflix show without episode', async () => {
    const sessionStore = makeSessionStoreMock();
    const { result } = renderHook(() => useInitFlow(sessionStore as ReturnType<typeof import('./useSessionStore').useSessionStore>));

    mockFetch.mockResolvedValueOnce(makeJsonResponse(tvmazeSearchResult('Naruto', 20)));

    await act(async () => {
      sendShowInfo({
        platform: 'crunchyroll',
        showTitle: 'Naruto',
        // no episodeInfo
      });
      await vi.runAllTimersAsync();
    });

    await waitFor(() => expect(result.current.phase).toBe('needs-episode'));
  });

  it('transitions to ready (not needs-episode) for Netflix even without episode info', async () => {
    const sessionStore = makeSessionStoreMock();
    const { result } = renderHook(() => useInitFlow(sessionStore as ReturnType<typeof import('./useSessionStore').useSessionStore>));

    mockFetch.mockResolvedValueOnce(makeJsonResponse(tvmazeSearchResult('Squid Game', 33)));

    await act(async () => {
      sendShowInfo({
        platform: 'netflix',
        showTitle: 'Squid Game',
        url: 'https://www.netflix.com/watch/81040344',
        // no episodeInfo
      });
      await vi.runAllTimersAsync();
    });

    await waitFor(() => expect(result.current.phase).toBe('ready'));
  });

  it('resets to no-show when a non-Netflix empty title arrives after a show was detected', async () => {
    const sessionStore = makeSessionStoreMock();
    const { result } = renderHook(() => useInitFlow(sessionStore as ReturnType<typeof import('./useSessionStore').useSessionStore>));

    mockFetch.mockResolvedValueOnce(makeJsonResponse(tvmazeSearchResult('One Piece', 10)));

    await act(async () => {
      sendShowInfo({
        platform: 'crunchyroll',
        showTitle: 'One Piece',
        episodeInfo: { season: '1', episode: '1' },
      });
      await vi.runAllTimersAsync();
    });

    await waitFor(() => expect(result.current.phase).toBe('ready'));

    // Navigate away — empty showTitle on crunchyroll.
    await act(async () => {
      sendShowInfo({ platform: 'crunchyroll', showTitle: '' });
    });

    expect(result.current.phase).toBe('no-show');
    expect(result.current.detectedShowInfo).toBeNull();
  });
});

// ─── confirmManualSetup ───────────────────────────────────────────────────────

describe('useInitFlow — confirmManualSetup', () => {
  it('sets phase to ready after manual setup', async () => {
    const sessionStore = makeSessionStoreMock();
    const { result } = renderHook(() => useInitFlow(sessionStore as ReturnType<typeof import('./useSessionStore').useSessionStore>));

    await act(async () => {
      await result.current.confirmManualSetup('Naruto', 20, 'crunchyroll', '1', '5');
      await vi.runAllTimersAsync();
    });

    expect(result.current.phase).toBe('ready');
  });

  it('triggers fetchRecap when showId and episode are present', async () => {
    const sessionStore = makeSessionStoreMock({
      loadOrCreateSession: vi.fn().mockReturnValue('manual-session'),
    });

    window.localStorage.setItem(
      'veil-sessions',
      JSON.stringify([{
        sessionId: 'manual-session',
        showTitle: 'Naruto',
        platform: 'crunchyroll',
        season: '1',
        episode: '5',
        context: '', // empty → recap should be fetched
        lastMessageAt: Date.now(),
        messageCount: 0,
        confirmed: false,
      }])
    );

    mockFetchRecap.mockResolvedValueOnce({ summary: 'Naruto recap', source: 'tvmaze' });

    const { result } = renderHook(() => useInitFlow(sessionStore as ReturnType<typeof import('./useSessionStore').useSessionStore>));

    await act(async () => {
      await result.current.confirmManualSetup('Naruto', 20, 'crunchyroll', '1', '5');
      await vi.runAllTimersAsync();
    });

    await waitFor(() => {
      expect(mockFetchRecap).toHaveBeenCalledWith(20, 1, 5, 'Naruto');
    });
  });
});
