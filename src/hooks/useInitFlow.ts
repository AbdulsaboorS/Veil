import { useState, useCallback, useEffect, useRef } from 'react';
import { InitPhase, ChatMessage, SessionMeta } from '@/lib/types';
import { useEpisodeRecap } from './useEpisodeRecap';
import { useSidePanel } from './useSidePanel';
import { useSessionStore } from './useSessionStore';
import { toast } from '@/components/ui/sonner';

interface DetectedShowInfo {
  platform: string;
  showTitle: string;
  episodeInfo?: { season: string; episode: string };
  url?: string;
}

const MESSAGES_PREFIX = 'spoilershield-msgs-';
const SESSIONS_KEY = 'spoilershield-sessions';
const NO_SHOW_TIMEOUT_MS = 2000;
const NETFLIX_NO_SHOW_TIMEOUT_MS = 10000; // Netflix player UI is ephemeral — give more time
const NO_SHOW_GRACE_MS = 8000; // Grace period before resetting on empty show signal

export function useInitFlow(sessionStore: ReturnType<typeof useSessionStore>) {
  const [phase, setPhase] = useState<InitPhase>('detecting');
  const [detectedShowInfo, setDetectedShowInfo] = useState<DetectedShowInfo | null>(null);
  const [isDetecting, setIsDetecting] = useState(false);

  const isSidePanel = useSidePanel();
  const { fetchRecap, isLoading: isLoadingRecap } = useEpisodeRecap();

  const hasReceivedShowInfo = useRef(false);
  const lastProcessedKeyRef = useRef<string | null>(null);
  const detectionTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pollIdRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const prevEpisodeRef = useRef<{ season: string; episode: string; sessionId: string } | null>(null);
  const noShowGraceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Latest-ref pattern: updated synchronously each render so callbacks can read
  // current values without listing them as deps (avoids identity churn → no loop).
  const sessionStoreRef = useRef(sessionStore);
  const fetchRecapRef = useRef(fetchRecap);
  sessionStoreRef.current = sessionStore;
  fetchRecapRef.current = fetchRecap;

  const doTVMazeLookupAndCreateSession = useCallback(async (showInfo: DetectedShowInfo) => {
    try {
      // Extract Netflix content ID from URL: /watch/81091879 → '81091879'
      let netflixContentId: string | undefined;
      if (showInfo.platform === 'netflix' && showInfo.url) {
        try {
          const parts = new URL(showInfo.url).pathname.split('/');
          const segment = parts[2]; // ['', 'watch', '81091879'][2]
          if (segment && /^\d+$/.test(segment)) netflixContentId = segment;
        } catch { /* invalid URL — ignore */ }
      }

      const kbResponse = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/get-show-context`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({
            showTitle: showInfo.showTitle,
            platform: showInfo.platform,
            netflixContentId,
          }),
        }
      );
      const kbData = kbResponse.ok ? await kbResponse.json() : null;
      const showId: number | undefined = kbData?.tvmazeId ?? undefined;
      const resolvedTitle: string = kbData?.resolvedTitle ?? showInfo.showTitle;
      // showSummary: used for Netflix no-episode path (show-level context from KB)
      const showSummary: string | undefined = kbData?.context ?? undefined;

      const season = showInfo.episodeInfo?.season ?? '';
      const episode = showInfo.episodeInfo?.episode ?? '';
      const hasEpisode = Boolean(season && episode);

      // If we have no showId, no episode, AND no title → genuine false positive.
      // Any real detection will have at least a title string.
      if (!showId && !hasEpisode && !showInfo.showTitle?.trim()) {
        setPhase('no-show');
        return;
      }

      const sessionId = sessionStoreRef.current.loadOrCreateSession(
        resolvedTitle,
        showId,
        showInfo.platform,
        season,
        episode
      );

      if (hasEpisode) {
        // Check if we need to auto-detect episode change
        const prev = prevEpisodeRef.current;
        const isSameShowDifferentEpisode =
          prev &&
          prev.sessionId !== sessionId &&
          (prev.season !== season || prev.episode !== episode);

        if (isSameShowDifferentEpisode && prev) {
          const oldKey = `${MESSAGES_PREFIX}${prev.sessionId}`;
          const newKey = `${MESSAGES_PREFIX}${sessionId}`;
          const oldEpLabel = `E${prev.episode}`;

          const importMessages = () => {
            try {
              const oldRaw = window.localStorage.getItem(oldKey);
              const oldMsgs: ChatMessage[] = oldRaw ? JSON.parse(oldRaw) : [];
              if (oldMsgs.length > 0) {
                const separator: ChatMessage = {
                  id: crypto.randomUUID(),
                  role: 'assistant',
                  content: `[Imported from ${oldEpLabel}]`,
                  timestamp: new Date(),
                };
                const combined = [...oldMsgs, separator];
                window.localStorage.setItem(newKey, JSON.stringify(combined));
                window.dispatchEvent(
                  new CustomEvent('spoilershield-messages-updated', { detail: { key: newKey } })
                );
              }
            } catch {}
          };

          toast(`Now watching Episode ${episode}`, {
            description: `Import your ${oldEpLabel} conversation into this session?`,
            action: {
              label: `Import ${oldEpLabel} chat`,
              onClick: importMessages,
            },
            duration: 6000,
          });
        }

        prevEpisodeRef.current = { season, episode, sessionId };

        // Fetch recap if session context is empty.
        // Read from localStorage directly — loadOrCreateSession writes synchronously.
        const allSessions: SessionMeta[] = JSON.parse(
          window.localStorage.getItem(SESSIONS_KEY) || '[]'
        );
        const currentMeta = allSessions.find(s => s.sessionId === sessionId);
        if (!currentMeta?.context && showId) {
          fetchRecapRef.current(showId, parseInt(season), parseInt(episode), resolvedTitle).then(result => {
            if (result.summary) {
              sessionStoreRef.current.updateContext(result.summary, sessionId);
            }
          });
        }

        setPhase('ready');
      } else {
        prevEpisodeRef.current = null;
        // Netflix watch pages: go ready even without episode info (it's ephemeral)
        if (showInfo.platform === 'netflix') {
          // Use show-level TVMaze summary as context fallback when episode info isn't available
          if (showSummary) {
            const allSessions: SessionMeta[] = JSON.parse(
              window.localStorage.getItem(SESSIONS_KEY) || '[]'
            );
            const currentMeta = allSessions.find(s => s.sessionId === sessionId);
            if (!currentMeta?.context) {
              sessionStoreRef.current.updateContext(`[Show overview] ${showSummary}`, sessionId);
            }
          }
          setPhase('ready');
        } else {
          setPhase('needs-episode');
        }
      }
    } catch (err) {
      console.error('[SpoilerShield] useInitFlow TVMaze lookup failed:', err);
      setPhase('error');
    }
  }, []); // stable identity — reads latest store/fetchRecap via refs

  // Session-first initialization: if a confirmed session already exists when the panel
  // opens (e.g. user closed and reopened), skip the detecting/resolving cycle and jump
  // straight to ready. Pre-seeding lastProcessedKeyRef prevents the first incoming show
  // info message from triggering doTVMazeLookupAndCreateSession for the same show.
  //
  // Uses [] deps (not [isSidePanel]) to run exactly once on mount — isSidePanel is
  // checked inline. This prevents double-seeding if isSidePanel transitions after mount.
  //
  // Caveat: if content.js returns a different title than what's stored (title drift),
  // the pre-seeded key won't match and doTVMazeLookupAndCreateSession will fire once —
  // this is acceptable (one extra get-show-context call, no incorrect behavior).
  //
  // Netflix: episode-based key format won't match the URL-based key the listener uses,
  // so Netflix will still run one detection cycle on reopen. Acceptable given limited
  // Netflix support in v1.
  useEffect(() => {
    if (!isSidePanel) return;
    const active = sessionStoreRef.current.activeSession;
    if (!active?.meta?.showTitle) return;

    const { showTitle, season, episode, platform, sessionId, context, showId } = active.meta;

    lastProcessedKeyRef.current = `${showTitle}|${season}|${episode}`;
    hasReceivedShowInfo.current = true;
    if (season && episode) {
      prevEpisodeRef.current = { season, episode, sessionId };
    }
    setDetectedShowInfo({ platform, showTitle, episodeInfo: season && episode ? { season, episode } : undefined });
    setPhase('ready');

    // Retry recap fetch if context was never populated (e.g. previous network error).
    if (!context && showId && season && episode) {
      fetchRecapRef.current(showId, parseInt(season), parseInt(episode), showTitle).then(result => {
        if (result.summary) {
          sessionStoreRef.current.updateContext(result.summary, sessionId);
        }
      });
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Set up message listener (side panel only)
  useEffect(() => {
    if (!isSidePanel) return;

    const onMessage = (event: MessageEvent) => {
      const data = event.data as unknown;
      if (!data || typeof data !== 'object') return;

      const maybe = data as { type?: unknown; payload?: unknown };
      if (maybe.type !== 'SPOILERSHIELD_SHOW_INFO') return;

      const showInfo = maybe.payload as {
        platform?: string;
        showTitle?: string;
        episodeInfo?: { season: string; episode: string };
        url?: string;
      };

      const showTitle = showInfo?.showTitle;
      const season = showInfo?.episodeInfo?.season ?? '';
      const episode = showInfo?.episodeInfo?.episode ?? '';

      // Home page / non-show page → apply grace period before resetting
      if (!showTitle) {
        // Netflix watch pages: title is ephemeral (only in DOM when player UI visible).
        // Stay in detecting — don't transition to no-show on empty updates; let the timer handle it.
        // Extend timeout on first Netflix /watch/ signal.
        // Note: if platform === 'netflix' but url lacks '/watch/' (e.g. Netflix homepage),
        // we intentionally fall through to the grace timer below — correct behavior.
        if (showInfo?.platform === 'netflix' && showInfo?.url?.includes('/watch/')) {
          if (detectionTimerRef.current) {
            clearTimeout(detectionTimerRef.current);
            detectionTimerRef.current = setTimeout(() => {
              detectionTimerRef.current = null;
              if (!hasReceivedShowInfo.current) {
                setPhase('no-show');
              }
            }, NETFLIX_NO_SHOW_TIMEOUT_MS);
          }
          return;
        }

        // Was tracking a show — apply grace period before resetting.
        // Covers brief navigation to homepage/browse within the streaming platform.
        // If a valid show title arrives before NO_SHOW_GRACE_MS, the timer is cancelled.
        if (lastProcessedKeyRef.current !== null && lastProcessedKeyRef.current !== '') {
          lastProcessedKeyRef.current = ''; // allow re-entry when valid show returns
          if (!noShowGraceRef.current) {
            noShowGraceRef.current = setTimeout(() => {
              noShowGraceRef.current = null;
              // Guard against requestRedetect() setting key to null mid-flight
              if (lastProcessedKeyRef.current === '' || lastProcessedKeyRef.current === null) {
                hasReceivedShowInfo.current = false;
                setDetectedShowInfo(null);
                setPhase('no-show');
              }
            }, NO_SHOW_GRACE_MS);
          }
        }
        return;
      }

      // Valid show title arrived — cancel any pending no-show grace reset
      if (noShowGraceRef.current) {
        clearTimeout(noShowGraceRef.current);
        noShowGraceRef.current = null;
      }

      // Content-based dedup: skip if same show+episode as last processed.
      // For Netflix: use URL as key since episode info may not be in DOM — URL always changes on navigation.
      const key = showInfo?.platform === 'netflix'
        ? `${showTitle}|${showInfo?.url ? new URL(showInfo.url).pathname : ''}`
        : `${showTitle}|${season}|${episode}`;
      if (lastProcessedKeyRef.current === key) return;
      lastProcessedKeyRef.current = key;

      // First real detection: stop no-show timer only; keep poll alive for episode changes
      if (!hasReceivedShowInfo.current) {
        hasReceivedShowInfo.current = true;
        if (detectionTimerRef.current) { clearTimeout(detectionTimerRef.current); detectionTimerRef.current = null; }
      }

      const info: DetectedShowInfo = {
        platform: showInfo?.platform || 'other',
        showTitle,
        episodeInfo: showInfo?.episodeInfo,
        url: showInfo?.url,
      };

      setDetectedShowInfo(info);
      setIsDetecting(false);
      setPhase('resolving');

      doTVMazeLookupAndCreateSession(info);
    };

    window.addEventListener('message', onMessage);

    // Request show info from extension — sidepanel.js listens on the same window
    const requestShowInfo = () => {
      window.postMessage({ type: 'SPOILERSHIELD_REQUEST_SHOW_INFO' }, '*');
    };

    requestShowInfo();
    setTimeout(requestShowInfo, 100);
    setTimeout(requestShowInfo, 500);
    setTimeout(requestShowInfo, 1000);

    const pollId = setInterval(requestShowInfo, 3000);
    pollIdRef.current = pollId;

    // Initial short timeout → no-show (extended for Netflix once platform is known).
    // The first SPOILERSHIELD_SHOW_INFO message arrives quickly (even if showTitle is empty)
    // and tells us the platform. For Netflix /watch/ pages we restart with a longer timeout.
    detectionTimerRef.current = setTimeout(() => {
      detectionTimerRef.current = null;
      if (!hasReceivedShowInfo.current) {
        setPhase('no-show');
      }
    }, NO_SHOW_TIMEOUT_MS);

    return () => {
      window.removeEventListener('message', onMessage);
      clearInterval(pollId);
      pollIdRef.current = null;
      if (detectionTimerRef.current) clearTimeout(detectionTimerRef.current);
      if (noShowGraceRef.current) clearTimeout(noShowGraceRef.current);
    };
  }, [isSidePanel]); // doTVMazeLookupAndCreateSession is stable ([] deps) — safe to omit

  /** Called when user manually sets up show+episode (from no-show or needs-episode) */
  const confirmManualSetup = useCallback(async (
    showTitle: string,
    showId: number | undefined,
    platform: string,
    season: string,
    episode: string
  ) => {
    setPhase('resolving');

    const sessionId = sessionStoreRef.current.loadOrCreateSession(showTitle, showId, platform, season, episode);

    // Read from localStorage directly — loadOrCreateSession writes synchronously
    const allSessions: SessionMeta[] = JSON.parse(
      window.localStorage.getItem(SESSIONS_KEY) || '[]'
    );
    const currentMeta = allSessions.find(s => s.sessionId === sessionId);
    if (!currentMeta?.context && showId && season && episode) {
      fetchRecapRef.current(showId, parseInt(season), parseInt(episode), showTitle).then(result => {
        if (result.summary) {
          sessionStoreRef.current.updateContext(result.summary, sessionId);
        }
      });
    }

    prevEpisodeRef.current = { season, episode, sessionId };
    setPhase('ready');
  }, []); // stable identity — reads latest store/fetchRecap via refs

  /** Re-request show info from extension */
  const requestRedetect = useCallback(() => {
    lastProcessedKeyRef.current = null;  // allow re-processing same show/episode
    // Cancel any pending grace timer — explicit redetect supersedes it
    if (noShowGraceRef.current) {
      clearTimeout(noShowGraceRef.current);
      noShowGraceRef.current = null;
    }
    setIsDetecting(true);
    setPhase('detecting');
    hasReceivedShowInfo.current = false;

    window.postMessage({ type: 'SPOILERSHIELD_REQUEST_REDETECT' }, '*');
    const req = () => {
      window.postMessage({ type: 'SPOILERSHIELD_REQUEST_SHOW_INFO' }, '*');
    };
    req();
    setTimeout(req, 500);
    setTimeout(req, 1000);
    setTimeout(req, 2000);

    if (detectionTimerRef.current) clearTimeout(detectionTimerRef.current);
    detectionTimerRef.current = setTimeout(() => {
      detectionTimerRef.current = null;
      if (!hasReceivedShowInfo.current) {
        setPhase('no-show');
        setIsDetecting(false);
      }
    }, 3000);
  }, []);

  return {
    phase,
    detectedShowInfo,
    isDetecting,
    isLoadingRecap,
    confirmManualSetup,
    requestRedetect,
  };
}
