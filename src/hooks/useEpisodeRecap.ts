import { useState, useCallback } from 'react';
import type { EpisodeSource } from '@/lib/types';

interface RecapResult {
  summary: string | null;
  source: EpisodeSource;
  tvmazeEpisodeUrl?: string;
  error?: string;
}

interface CachedEpisode {
  summary: string;
  source: EpisodeSource;
  cachedAt: number;
}

const CACHE_TTL = 7 * 24 * 60 * 60 * 1000; // 7 days

export function useEpisodeRecap() {
  const [recap, setRecap] = useState<RecapResult>({ summary: null, source: null });
  const [isLoading, setIsLoading] = useState(false);

  const fetchRecap = useCallback(async (
    showId: number,
    season: number,
    episode: number,
    showTitle?: string,
    rawEpisode?: string
  ): Promise<RecapResult> => {
    setIsLoading(true);

    const cacheKey = `kb_episode_${showId}_s${season}_e${episode}`;
    const cachedRaw = localStorage.getItem(cacheKey);
    if (cachedRaw) {
      try {
        const cached: CachedEpisode = JSON.parse(cachedRaw);
        if (Date.now() - cached.cachedAt <= CACHE_TTL) {
          const result = { summary: cached.summary, source: cached.source };
          setRecap(result);
          setIsLoading(false);
          return result;
        }
        localStorage.removeItem(cacheKey);
      } catch {
        localStorage.removeItem(cacheKey);
      }
    }

    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/get-show-context`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({ showTitle, platform: 'other', season, episode, tvmazeId: showId, rawEpisode }),
        }
      );

      if (!response.ok) throw new Error(`get-show-context ${response.status}`);
      const data = await response.json();
      const result: RecapResult = {
        summary: data.context,
        source: data.source,
        tvmazeEpisodeUrl: data.tvmazeEpisodeUrl ?? undefined,
      };

      if (result.summary) {
        localStorage.setItem(cacheKey, JSON.stringify({ ...result, cachedAt: Date.now() }));
      }
      setRecap(result);
      setIsLoading(false);
      return result;
    } catch (err) {
      console.error('[Veil] get-show-context failed:', err);
      const result: RecapResult = { summary: null, source: null, error: 'Failed to fetch context' };
      setRecap(result);
      setIsLoading(false);
      return result;
    }
  }, []); // stable — no deps

  const setManualRecap = (text: string) => {
    setRecap({ summary: text, source: 'manual' });
  };

  const clearRecap = () => {
    setRecap({ summary: null, source: null });
  };

  return {
    recap,
    isLoading,
    fetchRecap,
    setManualRecap,
    clearRecap,
  };
}
