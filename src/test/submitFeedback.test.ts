import { describe, it, expect, vi, beforeEach } from 'vitest';
import { submitFeedback } from '@/lib/submitFeedback';

const mockMeta = {
  sessionId: 'test-session',
  showTitle: 'JJK',
  platform: 'crunchyroll',
  season: '1',
  episode: '6',
  context: '',
  lastMessageAt: Date.now(),
  messageCount: 0,
};

describe('submitFeedback', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true }));
  });

  it('POSTs to the log-feedback edge function URL', async () => {
    await submitFeedback('Great show!', mockMeta);
    expect(vi.mocked(fetch)).toHaveBeenCalledOnce();
    const [url] = vi.mocked(fetch).mock.calls[0] as [string, RequestInit];
    expect(url).toContain('log-feedback');
  });

  it('includes text, showTitle, platform, season, episode in the body', async () => {
    await submitFeedback('Great show!', mockMeta);
    const [, init] = vi.mocked(fetch).mock.calls[0] as [string, RequestInit];
    const body = JSON.parse(init.body as string);
    expect(body).toMatchObject({
      text: 'Great show!',
      showTitle: 'JJK',
      platform: 'crunchyroll',
      season: '1',
      episode: '6',
    });
  });
});
