/**
 * useEpisodeRecap.test.ts
 *
 * Coverage:
 *   fetchRecap (single get-show-context call):
 *     - Cache hit: returns without network call
 *     - Cache hit expired: evicts and re-fetches
 *     - Cache miss: calls get-show-context, stores result, returns summary
 *     - get-show-context returns null context: returns { summary: null, source: null }
 *     - get-show-context 500 error: returns { summary: null, source: null, error }
 *     - get-show-context network failure: returns { summary: null, source: null, error }
 *     - Result with summary is cached; result without summary is not
 *     - Cache key uses tvmazeId (showId), season, episode (not showTitle)
 *
 *   setManualRecap / clearRecap still work
 *   isLoading transitions correctly
 */

import { describe, it, expect, beforeEach, vi, type MockedFunction } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useEpisodeRecap } from './useEpisodeRecap';

// Note: vi.stubGlobal('import', ...) cannot override import.meta.env in Vite because
// the env values are substituted at transform time. URL assertions use toContain instead.

// ─── fetch mock helpers ───────────────────────────────────────────────────────

const mockFetch = vi.fn() as MockedFunction<typeof fetch>;

beforeEach(() => {
  global.fetch = mockFetch;
  mockFetch.mockReset();
  localStorage.clear();
});

function makeJsonResponse(body: unknown, ok = true, status = 200): Response {
  return {
    ok,
    status,
    json: async () => body,
    text: async () => JSON.stringify(body),
  } as unknown as Response;
}

const CACHE_TTL = 7 * 24 * 60 * 60 * 1000;
const KB_ENDPOINT_PATH = '/functions/v1/get-show-context';

function kbResponse(context: string | null, source: string | null = 'tvmaze') {
  return {
    context,
    source,
    resolvedTitle: 'Test Show',
    tvmazeId: 42,
    anilistId: null,
    showDbId: 1,
    confidence: 'inferred',
  };
}

// ─── cache hit ────────────────────────────────────────────────────────────────

describe('fetchRecap — cache hit', () => {
  it('returns cached result without calling fetch', async () => {
    const cacheKey = 'kb_episode_42_s1_e3';
    localStorage.setItem(cacheKey, JSON.stringify({
      summary: 'Cached episode summary',
      source: 'tvmaze',
      cachedAt: Date.now(),
    }));

    const { result } = renderHook(() => useEpisodeRecap());

    let recap: Awaited<ReturnType<typeof result.current.fetchRecap>>;
    await act(async () => {
      recap = await result.current.fetchRecap(42, 1, 3, 'Test Show');
    });

    expect(recap!.summary).toBe('Cached episode summary');
    expect(recap!.source).toBe('tvmaze');
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('evicts expired cache and calls get-show-context', async () => {
    const cacheKey = 'kb_episode_42_s1_e3';
    localStorage.setItem(cacheKey, JSON.stringify({
      summary: 'Stale summary',
      source: 'tvmaze',
      cachedAt: Date.now() - CACHE_TTL - 1000,
    }));

    mockFetch.mockResolvedValueOnce(makeJsonResponse(kbResponse('Fresh summary')));

    const { result } = renderHook(() => useEpisodeRecap());
    let recap: Awaited<ReturnType<typeof result.current.fetchRecap>>;
    await act(async () => {
      recap = await result.current.fetchRecap(42, 1, 3, 'Test Show');
    });

    expect(recap!.summary).toBe('Fresh summary');
    expect(mockFetch).toHaveBeenCalledTimes(1);
    expect(mockFetch).toHaveBeenCalledWith(expect.stringContaining(KB_ENDPOINT_PATH), expect.anything());

    // New value stored in cache
    const stored = JSON.parse(localStorage.getItem(cacheKey)!);
    expect(stored.summary).toBe('Fresh summary');
  });
});

// ─── cache miss ───────────────────────────────────────────────────────────────

describe('fetchRecap — cache miss', () => {
  it('calls get-show-context, caches result, and returns summary', async () => {
    mockFetch.mockResolvedValueOnce(makeJsonResponse(kbResponse('Episode summary from KB', 'tvmaze')));

    const { result } = renderHook(() => useEpisodeRecap());
    let recap: Awaited<ReturnType<typeof result.current.fetchRecap>>;
    await act(async () => {
      recap = await result.current.fetchRecap(42, 1, 1, 'Jujutsu Kaisen');
    });

    expect(recap!.summary).toBe('Episode summary from KB');
    expect(recap!.source).toBe('tvmaze');
    expect(mockFetch).toHaveBeenCalledTimes(1);

    const [url, opts] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(url).toContain(KB_ENDPOINT_PATH);
    const body = JSON.parse(opts.body as string);
    expect(body.showTitle).toBe('Jujutsu Kaisen');
    expect(body.season).toBe(1);
    expect(body.episode).toBe(1);
    expect(body.tvmazeId).toBe(42);

    // Cached under kb_episode_42_s1_e1
    const cached = JSON.parse(localStorage.getItem('kb_episode_42_s1_e1')!);
    expect(cached.summary).toBe('Episode summary from KB');
    expect(cached.source).toBe('tvmaze');
  });

  it('does not cache when context is null', async () => {
    mockFetch.mockResolvedValueOnce(makeJsonResponse(kbResponse(null, null)));

    const { result } = renderHook(() => useEpisodeRecap());
    await act(async () => {
      await result.current.fetchRecap(42, 1, 1, 'Unknown Show');
    });

    expect(localStorage.getItem('kb_episode_42_s1_e1')).toBeNull();
  });

  it('cache key uses showId (not showTitle)', async () => {
    mockFetch.mockResolvedValueOnce(makeJsonResponse(kbResponse('Summary A', 'tvmaze')));

    const { result } = renderHook(() => useEpisodeRecap());
    await act(async () => {
      await result.current.fetchRecap(99, 2, 5, 'Some Show');
    });

    expect(localStorage.getItem('kb_episode_99_s2_e5')).not.toBeNull();
    expect(localStorage.getItem('kb_episode_99_s2_e5_some-show')).toBeNull();
  });
});

// ─── error handling ───────────────────────────────────────────────────────────

describe('fetchRecap — error handling', () => {
  it('returns { summary: null, source: null, error } on 500', async () => {
    mockFetch.mockResolvedValueOnce(makeJsonResponse({ error: 'internal' }, false, 500));

    const { result } = renderHook(() => useEpisodeRecap());
    let recap: Awaited<ReturnType<typeof result.current.fetchRecap>>;
    await act(async () => {
      recap = await result.current.fetchRecap(42, 1, 1, 'Test Show');
    });

    expect(recap!.summary).toBeNull();
    expect(recap!.source).toBeNull();
    expect(recap!.error).toBeDefined();
  });

  it('returns { summary: null, source: null, error } on network failure', async () => {
    mockFetch.mockRejectedValueOnce(new Error('network error'));

    const { result } = renderHook(() => useEpisodeRecap());
    let recap: Awaited<ReturnType<typeof result.current.fetchRecap>>;
    await act(async () => {
      recap = await result.current.fetchRecap(42, 1, 1, 'Test Show');
    });

    expect(recap!.summary).toBeNull();
    expect(recap!.error).toBeDefined();
  });

  it('returns null context without error field when KB returns context: null', async () => {
    mockFetch.mockResolvedValueOnce(makeJsonResponse(kbResponse(null, null)));

    const { result } = renderHook(() => useEpisodeRecap());
    let recap: Awaited<ReturnType<typeof result.current.fetchRecap>>;
    await act(async () => {
      recap = await result.current.fetchRecap(42, 1, 1, 'Test Show');
    });

    expect(recap!.summary).toBeNull();
    expect(recap!.source).toBeNull();
    expect(recap!.error).toBeUndefined();
  });
});

// ─── setManualRecap / clearRecap ──────────────────────────────────────────────

describe('setManualRecap / clearRecap', () => {
  it('setManualRecap sets summary with manual source', () => {
    const { result } = renderHook(() => useEpisodeRecap());

    act(() => {
      result.current.setManualRecap('User typed this');
    });

    expect(result.current.recap.summary).toBe('User typed this');
    expect(result.current.recap.source).toBe('manual');
  });

  it('clearRecap resets to null', () => {
    const { result } = renderHook(() => useEpisodeRecap());

    act(() => {
      result.current.setManualRecap('something');
    });
    act(() => {
      result.current.clearRecap();
    });

    expect(result.current.recap.summary).toBeNull();
    expect(result.current.recap.source).toBeNull();
  });
});

// ─── isLoading ────────────────────────────────────────────────────────────────

describe('useEpisodeRecap — isLoading', () => {
  it('is false initially', () => {
    const { result } = renderHook(() => useEpisodeRecap());
    expect(result.current.isLoading).toBe(false);
  });

  it('is false after fetchRecap resolves', async () => {
    mockFetch.mockResolvedValueOnce(makeJsonResponse(kbResponse(null, null)));

    const { result } = renderHook(() => useEpisodeRecap());
    await act(async () => {
      await result.current.fetchRecap(1, 1, 1, 'Any Show');
    });

    expect(result.current.isLoading).toBe(false);
  });

  it('is false after fetchRecap fails', async () => {
    mockFetch.mockRejectedValueOnce(new Error('fail'));

    const { result } = renderHook(() => useEpisodeRecap());
    await act(async () => {
      await result.current.fetchRecap(1, 1, 1, 'Any Show');
    });

    expect(result.current.isLoading).toBe(false);
  });
});

// ─── AniList source passthrough ───────────────────────────────────────────────

describe('fetchRecap — source passthrough', () => {
  it('passes through anilist source from KB response', async () => {
    mockFetch.mockResolvedValueOnce(makeJsonResponse(kbResponse('[Show overview] AniList desc', 'anilist')));

    const { result } = renderHook(() => useEpisodeRecap());
    let recap: Awaited<ReturnType<typeof result.current.fetchRecap>>;
    await act(async () => {
      recap = await result.current.fetchRecap(42, 1, 1, 'Some Anime');
    });

    expect(recap!.source).toBe('anilist');
    expect(recap!.summary).toBe('[Show overview] AniList desc');
  });
});
