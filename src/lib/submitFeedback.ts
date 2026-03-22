import { SessionMeta } from '@/lib/types';

/**
 * POST feedback text + session metadata to the log-feedback Supabase edge function.
 * Throws on non-ok HTTP responses so callers can catch and surface errors.
 */
export async function submitFeedback(
  text: string,
  meta: SessionMeta | null,
): Promise<void> {
  const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/log-feedback`;
  const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

  const body = {
    text: text.trim().slice(0, 2000),
    showTitle: meta?.showTitle ?? null,
    platform: meta?.platform ?? null,
    season: meta?.season ?? null,
    episode: meta?.episode ?? null,
  };

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${key}`,
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    throw new Error(`log-feedback returned ${res.status}`);
  }
}
