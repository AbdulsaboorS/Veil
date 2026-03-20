import { useState, useCallback, useMemo, useRef } from 'react';
import { SessionMeta, ChatMessage } from '@/lib/types';

const SESSIONS_KEY = 'veil-sessions';
const ACTIVE_SESSION_KEY = 'veil-active-session';
const MESSAGES_PREFIX = 'veil-msgs-';
const LEGACY_CHAT_KEY = 'spoilershield-chat';  // intentionally unchanged: old legacy key
const MAX_SESSIONS = 10;

/**
 * One-time migration: rename spoilershield-* localStorage keys to veil-*.
 * Write-first strategy: new key is written before old key is deleted,
 * so worst case is duplicate data — never data loss.
 */
function migrateStorageKeys(): void {
  try {
    // Migrate sessions list
    const oldSessions = window.localStorage.getItem('spoilershield-sessions');
    if (oldSessions && !window.localStorage.getItem('veil-sessions')) {
      window.localStorage.setItem('veil-sessions', oldSessions);
      window.localStorage.removeItem('spoilershield-sessions');
    }

    // Migrate active session pointer
    const oldActive = window.localStorage.getItem('spoilershield-active-session');
    if (oldActive && !window.localStorage.getItem('veil-active-session')) {
      window.localStorage.setItem('veil-active-session', oldActive);
      window.localStorage.removeItem('spoilershield-active-session');
    }

    // Migrate all spoilershield-msgs-{id} → veil-msgs-{id}
    const keysToMigrate: string[] = [];
    for (let i = 0; i < window.localStorage.length; i++) {
      const key = window.localStorage.key(i);
      if (key?.startsWith('spoilershield-msgs-')) {
        keysToMigrate.push(key);
      }
    }
    for (const oldKey of keysToMigrate) {
      const newKey = oldKey.replace('spoilershield-msgs-', 'veil-msgs-');
      if (!window.localStorage.getItem(newKey)) {
        const value = window.localStorage.getItem(oldKey);
        if (value) window.localStorage.setItem(newKey, value);
      }
      window.localStorage.removeItem(oldKey);
    }

    // Migrate spoilershield-reports → veil-reports
    const oldReports = window.localStorage.getItem('spoilershield-reports');
    if (oldReports && !window.localStorage.getItem('veil-reports')) {
      window.localStorage.setItem('veil-reports', oldReports);
      window.localStorage.removeItem('spoilershield-reports');
    }

    // Migrate spoilershield-setup → veil-setup
    const oldSetup = window.localStorage.getItem('spoilershield-setup');
    if (oldSetup && !window.localStorage.getItem('veil-setup')) {
      window.localStorage.setItem('veil-setup', oldSetup);
      window.localStorage.removeItem('spoilershield-setup');
    }
  } catch {
    // Never crash on migration failure
  }
}

// Run migration once at module load
migrateStorageKeys();

function slugify(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

export function makeSessionId(
  showId: number | undefined,
  showTitle: string,
  season: string,
  episode: string
): string {
  const base = showId ? String(showId) : slugify(showTitle);
  return `${base}-s${season}e${episode}`;
}

function readSessions(): SessionMeta[] {
  try {
    const raw = window.localStorage.getItem(SESSIONS_KEY);
    if (raw) return JSON.parse(raw);

    // Migration: check for legacy chat
    const legacyRaw = window.localStorage.getItem(LEGACY_CHAT_KEY);
    if (legacyRaw) {
      const legacyMsgs: ChatMessage[] = JSON.parse(legacyRaw);
      if (legacyMsgs?.length > 0) {
        const legacySession: SessionMeta = {
          sessionId: 'legacy-session',
          showTitle: 'Previous conversation',
          platform: 'other',
          season: '',
          episode: '',
          context: '',
          lastMessageAt: Date.now(),
          messageCount: legacyMsgs.length,
        };
        // Copy legacy messages to new key
        window.localStorage.setItem(`${MESSAGES_PREFIX}legacy-session`, legacyRaw);
        const sessions = [legacySession];
        window.localStorage.setItem(SESSIONS_KEY, JSON.stringify(sessions));
        return sessions;
      }
    }
    return [];
  } catch {
    return [];
  }
}

function writeSessions(sessions: SessionMeta[]): void {
  window.localStorage.setItem(SESSIONS_KEY, JSON.stringify(sessions));
}

export function useSessionStore() {
  const [sessions, setSessions] = useState<SessionMeta[]>(() => readSessions());

  const [activeSessionId, setActiveSessionId] = useState<string | null>(() => {
    return window.localStorage.getItem(ACTIVE_SESSION_KEY);
  });

  // Mirror of activeSessionId for use in callbacks without stale-closure risk
  const activeSessionIdRef = useRef(activeSessionId);
  activeSessionIdRef.current = activeSessionId;

  const persistSessions = useCallback((newSessions: SessionMeta[]) => {
    writeSessions(newSessions);
    setSessions(newSessions);
  }, []);

  const loadOrCreateSession = useCallback((
    showTitle: string,
    showId: number | undefined,
    platform: string,
    season: string,
    episode: string,
    context?: string
  ): string => {
    const sessionId = makeSessionId(showId, showTitle, season, episode);

    setSessions(prev => {
      const existing = prev.find(s => s.sessionId === sessionId);

      if (existing) {
        const updated = prev.map(s =>
          s.sessionId === sessionId ? { ...s, lastMessageAt: Date.now() } : s
        );
        writeSessions(updated);
        return updated;
      }

      const newSession: SessionMeta = {
        sessionId,
        showId,
        showTitle,
        platform,
        season,
        episode,
        context: context || '',
        lastMessageAt: Date.now(),
        messageCount: 0,
        confirmed: false,
      };

      let newSessions = [newSession, ...prev];

      // Evict oldest if over limit
      if (newSessions.length > MAX_SESSIONS) {
        const toEvict = newSessions.slice(MAX_SESSIONS);
        toEvict.forEach(s => {
          window.localStorage.removeItem(`${MESSAGES_PREFIX}${s.sessionId}`);
        });
        newSessions = newSessions.slice(0, MAX_SESSIONS);
      }

      writeSessions(newSessions);
      return newSessions;
    });

    setActiveSessionId(sessionId);
    window.localStorage.setItem(ACTIVE_SESSION_KEY, sessionId);
    return sessionId;
  }, []);

  const switchSession = useCallback((sessionId: string) => {
    setActiveSessionId(sessionId);
    window.localStorage.setItem(ACTIVE_SESSION_KEY, sessionId);
    setSessions(prev => {
      const updated = prev.map(s =>
        s.sessionId === sessionId ? { ...s, lastMessageAt: Date.now() } : s
      );
      writeSessions(updated);
      return updated;
    });
  }, []);

  const deleteSession = useCallback((sessionId: string) => {
    window.localStorage.removeItem(`${MESSAGES_PREFIX}${sessionId}`);
    setSessions(prev => {
      const newSessions = prev.filter(s => s.sessionId !== sessionId);
      writeSessions(newSessions);
      return newSessions;
    });
    setActiveSessionId(prev => {
      if (prev !== sessionId) return prev;
      // Re-read sessions (after delete) to find next
      const remaining = readSessions().filter(s => s.sessionId !== sessionId);
      const nextId = remaining[0]?.sessionId ?? null;
      if (nextId) {
        window.localStorage.setItem(ACTIVE_SESSION_KEY, nextId);
      } else {
        window.localStorage.removeItem(ACTIVE_SESSION_KEY);
      }
      return nextId;
    });
  }, []);

  const updateContext = useCallback((context: string, explicitSessionId?: string) => {
    const currentId = explicitSessionId ?? activeSessionIdRef.current;
    if (!currentId) return;
    setSessions(prev => {
      const updated = prev.map(s =>
        s.sessionId === currentId ? { ...s, context } : s
      );
      writeSessions(updated);
      return updated;
    });
  }, []);

  const updateEpisode = useCallback((season: string, episode: string) => {
    const currentId = activeSessionIdRef.current;
    if (!currentId) return;
    setSessions(prev => {
      const updated = prev.map(s =>
        s.sessionId === currentId ? { ...s, season, episode } : s
      );
      writeSessions(updated);
      return updated;
    });
  }, []);

  const syncMessageCount = useCallback((sessionId: string) => {
    try {
      const raw = window.localStorage.getItem(`${MESSAGES_PREFIX}${sessionId}`);
      const msgs: ChatMessage[] = raw ? JSON.parse(raw) : [];
      setSessions(prev => {
        const updated = prev.map(s =>
          s.sessionId === sessionId
            ? { ...s, messageCount: msgs.length, lastMessageAt: Date.now(), confirmed: true }
            : s
        );
        writeSessions(updated);
        return updated;
      });
    } catch {}
  }, []);

  const getMessagesKey = useCallback((sessionId: string): string => {
    return `${MESSAGES_PREFIX}${sessionId}`;
  }, []);

  const confirmedSessions = useMemo(
    () => sessions.filter(s => s.confirmed !== false),
    [sessions]
  );

  const activeSession = useMemo(() => {
    if (!activeSessionId) return null;
    const meta = sessions.find(s => s.sessionId === activeSessionId);
    if (!meta) return null;
    try {
      const raw = window.localStorage.getItem(`${MESSAGES_PREFIX}${activeSessionId}`);
      const messages: ChatMessage[] = raw ? JSON.parse(raw) : [];
      return { meta, messages };
    } catch {
      return { meta, messages: [] };
    }
  }, [sessions, activeSessionId]);

  return {
    sessions,
    confirmedSessions,
    activeSession,
    activeSessionId,
    loadOrCreateSession,
    switchSession,
    deleteSession,
    updateContext,
    updateEpisode,
    syncMessageCount,
    getMessagesKey,
  };
}
