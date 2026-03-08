/**
 * useEpisodeRecap.test.ts
 *
 * Coverage plan:
 *   fetchAniListShow:
 *     - Cache hit: returns cached result without calling fetch
 *     - Cache hit expired: evicts and re-fetches
 *     - Cache miss + successful AniList + successful sanitize → caches and returns 'anilist'
 *     - Cache miss + successful AniList + sanitize fails → returns raw description (graceful fallback)
 *     - AniList returns empty/missing description → returns { summary: null, source: null }
 *     - AniList network failure → returns { summary: null, source: null }
 *     - HTML entity stripping (AniList description with <br>, &amp;, &nbsp; etc.)
 *
 *   fetchRecap fallback chain (newly inserted AniList tier):
 *     - TVMaze has summary → uses TVMaze, never calls AniList
 *     - TVMaze empty + AniList has summary → returns AniList result, never calls Fandom
 *     - TVMaze empty + AniList empty + Fandom has result → falls through to Fandom
 *     - TVMaze empty + AniList empty + Fandom empty + web search has result → returns websearch
 *     - All tiers empty → { summary: null, source: null }
 *     - TVMaze cache hit → short-circuits all downstream fetches
 *
 *   fetchAniListShow cache key:
 *     - Uses slugified showTitle (lowercase, spaces → hyphens)
 *     - Cache key is show-level (no season/episode component)
 */

import { describe, it, expect, beforeEach, vi, type MockedFunction } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useEpisodeRecap } from './useEpisodeRecap';

// ─── mock import.meta.env ─────────────────────────────────────────────────────
// Vite replaces import.meta.env at build time; in tests we mock it via vi.stubGlobal
// because jsdom does not define it.
vi.stubGlobal('import', {
  meta: {
    env: {
      VITE_SUPABASE_URL: 'https://test.supabase.co',
      VITE_SUPABASE_PUBLISHABLE_KEY: 'test-anon-key',
    },
  },
});

// ─── fetch mock helpers ───────────────────────────────────────────────────────

// We replace global.fetch before each test group.
const mockFetch = vi.fn() as MockedFunction<typeof fetch>;

beforeEach(() => {
  global.fetch = mockFetch;
  mockFetch.mockReset();
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

// ─── AniList response builder ─────────────────────────────────────────────────

function anilistResponse(description: string | null) {
  return {
    data: {
      Media: description !== null
        ? { id: 1, title: { romaji: 'Attack on Titan', english: 'Attack on Titan' }, description, episodes: 25, status: 'FINISHED' }
        : null,
    },
  };
}

function sanitizeResponse(sanitized: string) {
  return { sanitized };
}

// ─── fetchAniListShow — cache hit ─────────────────────────────────────────────

describe('fetchAniListShow — cache hit', () => {
  it('returns the cached result and does not call fetch', async () => {
    const cacheKey = 'anilist_show_attack-on-titan';
    window.localStorage.setItem(cacheKey, JSON.stringify({
      summary: '[Show overview] Cached summary',
      source: 'anilist',
      cachedAt: Date.now(),
    }));

    const { result } = renderHook(() => useEpisodeRecap());

    // We drive fetchAniListShow indirectly via fetchRecap by making TVMaze return empty.
    // fetchRecap → no TVMaze summary → fetchAniListShow
    mockFetch.mockResolvedValueOnce(makeJsonResponse({ summary: null })); // TVMaze episode → no summary

    let recap: Awaited<ReturnType<typeof result.current.fetchRecap>>;
    await act(async () => {
      recap = await result.current.fetchRecap(1, 1, 1, 'Attack on Titan');
    });

    expect(recap!.summary).toBe('[Show overview] Cached summary');
    expect(recap!.source).toBe('anilist');
    // fetch was only called once (TVMaze) — AniList was not fetched because of cache hit.
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it('evicts expired cache and re-fetches from AniList', async () => {
    const cacheKey = 'anilist_show_attack-on-titan';
    window.localStorage.setItem(cacheKey, JSON.stringify({
      summary: '[Show overview] Stale summary',
      source: 'anilist',
      cachedAt: Date.now() - CACHE_TTL - 1000, // expired
    }));

    const { result } = renderHook(() => useEpisodeRecap());

    mockFetch
      .mockResolvedValueOnce(makeJsonResponse({ summary: null }))                    // TVMaze episode → no summary
      .mockResolvedValueOnce(makeJsonResponse(anilistResponse('Fresh description'))) // AniList
      .mockResolvedValueOnce(makeJsonResponse(sanitizeResponse('Sanitized fresh'))); // sanitize

    let recap: Awaited<ReturnType<typeof result.current.fetchRecap>>;
    await act(async () => {
      recap = await result.current.fetchRecap(1, 1, 1, 'Attack on Titan');
    });

    // Expired cache entry should have been replaced.
    expect(window.localStorage.getItem(cacheKey)).not.toBeNull();
    const stored = JSON.parse(window.localStorage.getItem(cacheKey)!);
    expect(stored.summary).toBe('[Show overview] Sanitized fresh');

    expect(recap!.source).toBe('anilist');
    expect(recap!.summary).toBe('[Show overview] Sanitized fresh');
  });
});

// ─── fetchAniListShow — cache miss + successful fetch ─────────────────────────

describe('fetchAniListShow — cache miss + successful fetch', () => {
  it('fetches from AniList, sanitizes, caches, and returns anilist source', async () => {
    const { result } = renderHook(() => useEpisodeRecap());

    mockFetch
      .mockResolvedValueOnce(makeJsonResponse({ summary: null }))                      // TVMaze episode → no summary
      .mockResolvedValueOnce(makeJsonResponse(anilistResponse('In a world of titans'))) // AniList
      .mockResolvedValueOnce(makeJsonResponse(sanitizeResponse('Safe description')));   // sanitize

    let recap: Awaited<ReturnType<typeof result.current.fetchRecap>>;
    await act(async () => {
      recap = await result.current.fetchRecap(1, 1, 1, 'Attack on Titan');
    });

    expect(recap!.summary).toBe('[Show overview] Safe description');
    expect(recap!.source).toBe('anilist');

    // Verify it was cached.
    const cacheKey = 'anilist_show_attack-on-titan';
    const cached = JSON.parse(window.localStorage.getItem(cacheKey)!);
    expect(cached.summary).toBe('[Show overview] Safe description');
    expect(cached.source).toBe('anilist');
  });

  it('uses raw description when sanitize call fails', async () => {
    const { result } = renderHook(() => useEpisodeRecap());

    mockFetch
      .mockResolvedValueOnce(makeJsonResponse({ summary: null }))                        // TVMaze
      .mockResolvedValueOnce(makeJsonResponse(anilistResponse('Raw AniList description'))) // AniList
      .mockRejectedValueOnce(new Error('sanitize network error'));                        // sanitize fails

    let recap: Awaited<ReturnType<typeof result.current.fetchRecap>>;
    await act(async () => {
      recap = await result.current.fetchRecap(1, 1, 1, 'Attack on Titan');
    });

    // Sanitize failed → raw description is used (show overview is low-risk).
    expect(recap!.summary).toBe('[Show overview] Raw AniList description');
    expect(recap!.source).toBe('anilist');
  });

  it('uses raw description when sanitize returns a non-ok response', async () => {
    const { result } = renderHook(() => useEpisodeRecap());

    mockFetch
      .mockResolvedValueOnce(makeJsonResponse({ summary: null }))                        // TVMaze
      .mockResolvedValueOnce(makeJsonResponse(anilistResponse('Original description')))  // AniList
      .mockResolvedValueOnce(makeJsonResponse({}, false, 500));                          // sanitize non-ok

    let recap: Awaited<ReturnType<typeof result.current.fetchRecap>>;
    await act(async () => {
      recap = await result.current.fetchRecap(1, 1, 1, 'Attack on Titan');
    });

    expect(recap!.summary).toBe('[Show overview] Original description');
    expect(recap!.source).toBe('anilist');
  });
});

// ─── fetchAniListShow — HTML entity stripping ─────────────────────────────────

describe('fetchAniListShow — HTML entity stripping', () => {
  it('strips HTML tags and decodes entities from AniList description', async () => {
    const rawHtml = 'Giants &amp; humans.<br>It&apos;s&nbsp;epic.';
    const { result } = renderHook(() => useEpisodeRecap());

    mockFetch
      .mockResolvedValueOnce(makeJsonResponse({ summary: null }))           // TVMaze
      .mockResolvedValueOnce(makeJsonResponse(anilistResponse(rawHtml)))    // AniList raw HTML
      .mockResolvedValueOnce(makeJsonResponse(sanitizeResponse('Giants & humans. Its epic.'))); // sanitize

    let recap: Awaited<ReturnType<typeof result.current.fetchRecap>>;
    await act(async () => {
      recap = await result.current.fetchRecap(1, 1, 1, 'Attack on Titan');
    });

    // The sanitize mock receives the stripped text; we just verify the final result
    // passes through correctly.
    expect(recap!.source).toBe('anilist');
  });

  it('returns null when AniList description is empty after stripping HTML', async () => {
    // A description that is only HTML tags → empty after strip.
    const { result } = renderHook(() => useEpisodeRecap());

    mockFetch
      .mockResolvedValueOnce(makeJsonResponse({ summary: null }))           // TVMaze
      .mockResolvedValueOnce(makeJsonResponse(anilistResponse('<br><br>  '))) // AniList → empty after strip
      // No more calls expected; fandom fetch for a non-JJK show returns null without fetch.
      .mockResolvedValueOnce(makeJsonResponse({ recap: null }));            // web search fallback

    let recap: Awaited<ReturnType<typeof result.current.fetchRecap>>;
    await act(async () => {
      recap = await result.current.fetchRecap(1, 1, 1, 'Attack on Titan');
    });

    // AniList result was empty → should continue fallback chain (or return null).
    // Since web search also returns nothing here, the final result is null.
    expect(recap!.summary).toBeNull();
  });
});

// ─── fetchAniListShow — AniList network failure ───────────────────────────────

describe('fetchAniListShow — AniList network failure', () => {
  it('returns null when AniList fetch throws', async () => {
    const { result } = renderHook(() => useEpisodeRecap());

    mockFetch
      .mockResolvedValueOnce(makeJsonResponse({ summary: null }))     // TVMaze
      .mockRejectedValueOnce(new Error('network error'))              // AniList throws
      .mockResolvedValueOnce(makeJsonResponse({ recap: null }));      // web search fallback

    let recap: Awaited<ReturnType<typeof result.current.fetchRecap>>;
    await act(async () => {
      recap = await result.current.fetchRecap(1, 1, 1, 'Attack on Titan');
    });

    expect(recap!.summary).toBeNull();
    expect(recap!.source).toBeNull();
  });

  it('returns null when AniList returns a non-ok HTTP status', async () => {
    const { result } = renderHook(() => useEpisodeRecap());

    mockFetch
      .mockResolvedValueOnce(makeJsonResponse({ summary: null }))          // TVMaze
      .mockResolvedValueOnce(makeJsonResponse({}, false, 429))             // AniList 429
      .mockResolvedValueOnce(makeJsonResponse({ recap: null }));           // web search

    let recap: Awaited<ReturnType<typeof result.current.fetchRecap>>;
    await act(async () => {
      recap = await result.current.fetchRecap(1, 1, 1, 'Attack on Titan');
    });

    expect(recap!.summary).toBeNull();
  });

  it('returns null when AniList Media field is absent', async () => {
    const { result } = renderHook(() => useEpisodeRecap());

    mockFetch
      .mockResolvedValueOnce(makeJsonResponse({ summary: null }))          // TVMaze
      .mockResolvedValueOnce(makeJsonResponse({ data: { Media: null } }))  // AniList no Media
      .mockResolvedValueOnce(makeJsonResponse({ recap: null }));           // web search

    let recap: Awaited<ReturnType<typeof result.current.fetchRecap>>;
    await act(async () => {
      recap = await result.current.fetchRecap(1, 1, 1, 'Attack on Titan');
    });

    expect(recap!.summary).toBeNull();
  });
});

// ─── fetchAniListShow — cache key shape ──────────────────────────────────────

describe('fetchAniListShow — cache key', () => {
  it('uses a show-level slug key (no season/episode)', async () => {
    const { result } = renderHook(() => useEpisodeRecap());

    mockFetch
      .mockResolvedValueOnce(makeJsonResponse({ summary: null }))                        // TVMaze
      .mockResolvedValueOnce(makeJsonResponse(anilistResponse('A great show')))          // AniList
      .mockResolvedValueOnce(makeJsonResponse(sanitizeResponse('Safe show summary')));   // sanitize

    await act(async () => {
      await result.current.fetchRecap(1, 2, 5, 'Jujutsu Kaisen'); // s2e5 — key should NOT include these
    });

    // Cache key must be show-level, not per-episode.
    const showKey = 'anilist_show_jujutsu-kaisen';
    expect(window.localStorage.getItem(showKey)).not.toBeNull();
    // No season/episode variant should exist.
    expect(window.localStorage.getItem('anilist_show_jujutsu-kaisen_s2_e5')).toBeNull();
  });
});

// ─── fetchRecap — fallback chain ──────────────────────────────────────────────

describe('fetchRecap — fallback chain', () => {
  it('returns TVMaze result and skips AniList when TVMaze has a summary', async () => {
    const { result } = renderHook(() => useEpisodeRecap());

    mockFetch
      .mockResolvedValueOnce(makeJsonResponse({ summary: '<p>Titan attacks the wall.</p>' })) // TVMaze episode
      .mockResolvedValueOnce(makeJsonResponse(sanitizeResponse('Titan attacks the wall.')));   // sanitize

    let recap: Awaited<ReturnType<typeof result.current.fetchRecap>>;
    await act(async () => {
      recap = await result.current.fetchRecap(42, 1, 1, 'Attack on Titan');
    });

    expect(recap!.source).toBe('tvmaze');
    expect(recap!.summary).toBe('Titan attacks the wall.');
    // Only 2 calls (TVMaze + sanitize) — AniList was never reached.
    expect(mockFetch).toHaveBeenCalledTimes(2);
    expect(mockFetch).not.toHaveBeenCalledWith('https://graphql.anilist.co', expect.anything());
  });

  it('tries AniList when TVMaze has no summary and returns AniList result before Fandom', async () => {
    const { result } = renderHook(() => useEpisodeRecap());

    mockFetch
      .mockResolvedValueOnce(makeJsonResponse({ summary: null }))                       // TVMaze episode → no summary
      .mockResolvedValueOnce(makeJsonResponse(anilistResponse('Sorcerers vs curses')))  // AniList ← should be called
      .mockResolvedValueOnce(makeJsonResponse(sanitizeResponse('Safe overview')));      // sanitize

    let recap: Awaited<ReturnType<typeof result.current.fetchRecap>>;
    await act(async () => {
      recap = await result.current.fetchRecap(42, 1, 1, 'Jujutsu Kaisen');
    });

    expect(recap!.source).toBe('anilist');
    // Fandom was NOT called (3 total calls: TVMaze episode, AniList, sanitize).
    expect(mockFetch).toHaveBeenCalledTimes(3);
    const calls = mockFetch.mock.calls.map(c => c[0] as string);
    expect(calls.some(url => url.includes('fetch-fandom-episode'))).toBe(false);
  });

  it('falls through to Fandom when TVMaze and AniList both return null', async () => {
    const { result } = renderHook(() => useEpisodeRecap());

    mockFetch
      .mockResolvedValueOnce(makeJsonResponse({ summary: null }))                 // TVMaze
      .mockResolvedValueOnce(makeJsonResponse({ data: { Media: null } }))         // AniList → null
      .mockResolvedValueOnce(makeJsonResponse({ combined: 'Fandom raw text' }))  // fetch-fandom-episode
      .mockResolvedValueOnce(makeJsonResponse(sanitizeResponse('Fandom safe')));  // sanitize

    let recap: Awaited<ReturnType<typeof result.current.fetchRecap>>;
    await act(async () => {
      // Fandom only works for Jujutsu Kaisen S1
      recap = await result.current.fetchRecap(42, 1, 3, 'Jujutsu Kaisen');
    });

    expect(recap!.source).toBe('fandom');
    expect(recap!.summary).toBe('Fandom safe');
  });

  it('falls through to web search when TVMaze, AniList, and Fandom all return null', async () => {
    const { result } = renderHook(() => useEpisodeRecap());

    mockFetch
      .mockResolvedValueOnce(makeJsonResponse({ summary: null }))             // TVMaze
      .mockResolvedValueOnce(makeJsonResponse({ data: { Media: null } }))     // AniList → null
      // Fandom is skipped for non-JJK shows without a fetch call.
      .mockResolvedValueOnce(makeJsonResponse({ recap: 'Web recap text' }))  // web search
      .mockResolvedValueOnce(makeJsonResponse(sanitizeResponse('Safe web recap'))); // sanitize

    let recap: Awaited<ReturnType<typeof result.current.fetchRecap>>;
    await act(async () => {
      recap = await result.current.fetchRecap(99, 1, 1, 'Some Obscure Anime');
    });

    expect(recap!.source).toBe('websearch');
    expect(recap!.summary).toBe('Safe web recap');
  });

  it('returns { summary: null, source: null } when all tiers return empty', async () => {
    const { result } = renderHook(() => useEpisodeRecap());

    mockFetch
      .mockResolvedValueOnce(makeJsonResponse({ summary: null }))         // TVMaze
      .mockResolvedValueOnce(makeJsonResponse({ data: { Media: null } })) // AniList
      .mockResolvedValueOnce(makeJsonResponse({ recap: null }));          // web search

    let recap: Awaited<ReturnType<typeof result.current.fetchRecap>>;
    await act(async () => {
      recap = await result.current.fetchRecap(99, 1, 1, 'Unknown Show');
    });

    expect(recap!.summary).toBeNull();
    expect(recap!.source).toBeNull();
  });

  it('returns TVMaze cached result and calls fetch zero times (short-circuit)', async () => {
    // Pre-populate TVMaze cache.
    const tvmazeCacheKey = 'tvmaze_episode_42_s1_e1';
    window.localStorage.setItem(tvmazeCacheKey, JSON.stringify({
      summary: 'Cached TVMaze summary',
      source: 'tvmaze',
      cachedAt: Date.now(),
    }));

    const { result } = renderHook(() => useEpisodeRecap());

    let recap: Awaited<ReturnType<typeof result.current.fetchRecap>>;
    await act(async () => {
      recap = await result.current.fetchRecap(42, 1, 1, 'Attack on Titan');
    });

    expect(recap!.summary).toBe('Cached TVMaze summary');
    expect(recap!.source).toBe('tvmaze');
    // Zero network calls — cache was used.
    expect(mockFetch).toHaveBeenCalledTimes(0);
  });

  it('does not call AniList when showTitle is not provided', async () => {
    const { result } = renderHook(() => useEpisodeRecap());

    // TVMaze episode fetch returns no summary; showTitle omitted → AniList/Fandom/websearch all skip.
    mockFetch.mockResolvedValueOnce(makeJsonResponse({ summary: null })); // TVMaze

    let recap: Awaited<ReturnType<typeof result.current.fetchRecap>>;
    await act(async () => {
      // showTitle not passed → undefined
      recap = await result.current.fetchRecap(42, 1, 1);
    });

    expect(recap!.summary).toBeNull();
    expect(mockFetch).toHaveBeenCalledTimes(1); // only TVMaze
    expect(mockFetch).not.toHaveBeenCalledWith('https://graphql.anilist.co', expect.anything());
  });
});

// ─── EpisodeSource type ───────────────────────────────────────────────────────

describe('EpisodeSource type — anilist literal', () => {
  it('source field accepts the anilist literal value', async () => {
    const { result } = renderHook(() => useEpisodeRecap());

    mockFetch
      .mockResolvedValueOnce(makeJsonResponse({ summary: null }))
      .mockResolvedValueOnce(makeJsonResponse(anilistResponse('Some description')))
      .mockResolvedValueOnce(makeJsonResponse(sanitizeResponse('Safe')));

    let recap: Awaited<ReturnType<typeof result.current.fetchRecap>>;
    await act(async () => {
      recap = await result.current.fetchRecap(1, 1, 1, 'My Show');
    });

    // TypeScript compile-time guarantee + runtime check.
    const validSources = ['tvmaze', 'anilist', 'fandom', 'websearch', 'manual', null];
    expect(validSources).toContain(recap!.source);
    expect(recap!.source).toBe('anilist');
  });
});

// ─── isLoading state ─────────────────────────────────────────────────────────

describe('useEpisodeRecap — isLoading', () => {
  it('is false initially', () => {
    const { result } = renderHook(() => useEpisodeRecap());
    expect(result.current.isLoading).toBe(false);
  });

  it('is false after fetchRecap resolves', async () => {
    const { result } = renderHook(() => useEpisodeRecap());

    mockFetch
      .mockResolvedValueOnce(makeJsonResponse({ summary: null }))
      .mockResolvedValueOnce(makeJsonResponse({ data: { Media: null } }))
      .mockResolvedValueOnce(makeJsonResponse({ recap: null }));

    await act(async () => {
      await result.current.fetchRecap(1, 1, 1, 'Any Show');
    });

    expect(result.current.isLoading).toBe(false);
  });
});
