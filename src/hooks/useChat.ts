import { useState, useCallback, useEffect, useRef } from 'react';
import { ChatMessage, WatchSetup } from '@/lib/types';

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/spoiler-shield-chat`;
const CLASSIFY_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/classify-question`;
const AUDIT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/audit-answer`;

const AUTH_HEADER = `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`;

/**
 * Process complete SSE lines from buffer, calling onChunk for each extracted text chunk.
 * Returns the remaining (possibly incomplete) buffer after processing.
 * On JSON parse failure the incomplete line is put back at the front of the buffer.
 */
function processStreamBuffer(buffer: string, onChunk: (chunk: string) => void): string {
  let newlineIndex: number;
  while ((newlineIndex = buffer.indexOf('\n')) !== -1) {
    let line = buffer.slice(0, newlineIndex);
    buffer = buffer.slice(newlineIndex + 1);
    if (line.endsWith('\r')) line = line.slice(0, -1);
    if (line.startsWith(':') || line.length === 0) continue;
    if (!line.startsWith('data: ')) continue;
    const jsonStr = line.slice(6).trim();
    try {
      const parsed = JSON.parse(jsonStr);
      const chunk = parsed.candidates?.[0]?.content?.parts?.[0]?.text;
      if (chunk) onChunk(chunk);
    } catch {
      buffer = line + '\n' + buffer;
      break;
    }
  }
  return buffer;
}

/**
 * Flush remaining buffer after stream ends — parse any leftover complete lines.
 * JSON parse errors are ignored (incomplete final chunk is discarded).
 */
function flushStreamBuffer(buffer: string, onChunk: (chunk: string) => void): void {
  for (let raw of buffer.split('\n')) {
    if (!raw) continue;
    if (raw.endsWith('\r')) raw = raw.slice(0, -1);
    if (raw.startsWith(':') || raw.length === 0) continue;
    if (!raw.startsWith('data: ')) continue;
    const jsonStr = raw.slice(6).trim();
    try {
      const parsed = JSON.parse(jsonStr);
      const chunk = parsed.candidates?.[0]?.content?.parts?.[0]?.text;
      if (chunk) onChunk(chunk);
    } catch { /* ignore */ }
  }
}

/** Simulates streaming by yielding chunks of text with small delays. */
async function fakeStream(text: string, onChunk: (content: string) => void) {
  const CHUNK = 6;
  const DELAY = 18; // ms — approximates natural streaming feel
  let i = 0;
  while (i < text.length) {
    i = Math.min(i + CHUNK, text.length);
    onChunk(text.slice(0, i));
    await new Promise(r => setTimeout(r, DELAY));
  }
}

export function useChat(storageKey = 'spoilershield-chat') {
  const storageKeyRef = useRef(storageKey);

  const [messages, setMessagesState] = useState<ChatMessage[]>(() => {
    try {
      const raw = window.localStorage.getItem(storageKey);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  });

  // Re-initialize when storageKey changes (e.g. switching sessions)
  useEffect(() => {
    if (storageKeyRef.current !== storageKey) {
      storageKeyRef.current = storageKey;
      try {
        const raw = window.localStorage.getItem(storageKey);
        setMessagesState(raw ? JSON.parse(raw) : []);
      } catch {
        setMessagesState([]);
      }
    }
  }, [storageKey]);

  // Listen for external writes to this key (e.g. message imports from another session)
  useEffect(() => {
    const onUpdate = (e: CustomEvent<{ key: string }>) => {
      if (e.detail.key === storageKey) {
        try {
          const raw = window.localStorage.getItem(storageKey);
          setMessagesState(raw ? JSON.parse(raw) : []);
        } catch {
          setMessagesState([]);
        }
      }
    };
    window.addEventListener('spoilershield-messages-updated', onUpdate as EventListener);
    return () => window.removeEventListener('spoilershield-messages-updated', onUpdate as EventListener);
  }, [storageKey]);

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const setMessages = useCallback((value: ChatMessage[] | ((prev: ChatMessage[]) => ChatMessage[])) => {
    setMessagesState(prev => {
      const next = value instanceof Function ? value(prev) : value;
      try {
        window.localStorage.setItem(storageKey, JSON.stringify(next));
      } catch {}
      return next;
    });
  }, [storageKey]);

  const sendMessage = useCallback(async (
    question: string,
    watchSetup: WatchSetup,
  ) => {
    const userMessage: ChatMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      content: question,
      timestamp: new Date(),
    };

    const userMessageId = userMessage.id;

    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);
    setError(null);

    // Helper: add or update the assistant message in state
    const updateAssistantMessage = (content: string) => {
      setMessages(prev => {
        let messagesWithUser = prev;
        const hasUserMessage = prev.some(m => m.id === userMessageId);
        if (!hasUserMessage) {
          messagesWithUser = [...prev, userMessage];
        }

        const last = messagesWithUser[messagesWithUser.length - 1];
        if (last?.role === 'assistant') {
          return messagesWithUser.map((m, i) =>
            i === messagesWithUser.length - 1 ? { ...m, content } : m
          );
        }
        return [...messagesWithUser, {
          id: crypto.randomUUID(),
          role: 'assistant' as const,
          content,
          timestamp: new Date(),
        }];
      });
    };

    // Helper: collect the full SSE stream into a string (no live updates)
    const collectStream = async (response: Response): Promise<string> => {
      if (!response.body) return '';
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let collected = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        buffer = processStreamBuffer(buffer, chunk => { collected += chunk; });
      }
      flushStreamBuffer(buffer, chunk => { collected += chunk; });
      return collected;
    };

    try {
      // ── Start BOTH fetches in parallel immediately ──────────────────
      // Classify resolves in at most 400ms; timeout defaults to safe (false).
      // Model itself handles spoiler refusals as the first safety layer.
      const classifyPromise = Promise.race([
        fetch(CLASSIFY_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': AUTH_HEADER },
          body: JSON.stringify({
            question,
            showTitle: watchSetup.showTitle,
            season: watchSetup.season,
            episode: watchSetup.episode,
          }),
        })
          .then(r => r.ok ? r.json() : { isSpoilerRisk: false })
          .catch(() => ({ isSpoilerRisk: false })),
        new Promise<{ isSpoilerRisk: boolean }>(resolve =>
          setTimeout(() => resolve({ isSpoilerRisk: false }), 400)
        ),
      ]);

      // Chat starts simultaneously — does not wait for classify
      const chatResponse = await fetch(CHAT_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': AUTH_HEADER },
        body: JSON.stringify({
          question,
          context: watchSetup.context,
          showInfo: {
            platform: watchSetup.platform,
            title: watchSetup.showTitle,
            season: watchSetup.season,
            episode: watchSetup.episode,
            timestamp: watchSetup.timestamp,
          },
        }),
      });

      if (!chatResponse.ok) {
        let errMsg = 'Failed to get response';
        try {
          const errBody = await chatResponse.json();
          if (errBody.error) errMsg = errBody.error;
          console.error('[SpoilerShield] API error:', {
            status: chatResponse.status,
            error: errBody.error,
            detail: errBody.detail,
            debug: errBody.debug,
          });
        } catch {
          console.error('[SpoilerShield] API error (unparseable):', chatResponse.status);
        }
        throw new Error(errMsg);
      }

      if (!chatResponse.body) throw new Error('No response body');

      // Await classify — if it resolved during the chat round-trip this is instant
      const { isSpoilerRisk } = await classifyPromise;

      if (!isSpoilerRisk) {
        // ── SAFE PATH: stream directly to UI ────────────────────────
        // Real streaming minimises time-to-first-text: user sees tokens
        // as Gemini generates them (~300–500ms on a warm function).
        const reader = chatResponse.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';
        let assistantContent = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          buffer = processStreamBuffer(buffer, chunk => {
            assistantContent += chunk;
            updateAssistantMessage(assistantContent);
          });
        }
        flushStreamBuffer(buffer, chunk => {
          assistantContent += chunk;
          updateAssistantMessage(assistantContent);
        });

      } else {
        // ── SPOILER-RISK PATH: collect silently → audit → fake stream ─
        const collected = await collectStream(chatResponse);

        // Audit the collected answer
        let finalContent = collected;
        try {
          const auditRes = await fetch(AUDIT_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': AUTH_HEADER },
            body: JSON.stringify({
              answer: collected,
              context: watchSetup.context ?? '',
              season: parseInt(watchSetup.season) || 0,
              episode: parseInt(watchSetup.episode) || 0,
            }),
          });
          if (auditRes.ok) {
            const auditData = await auditRes.json();
            if (auditData.audited) finalContent = auditData.audited;
          }
        } catch {
          // audit failure is non-fatal — use collected answer
        }

        // Fake-stream the final (audited) answer
        if (finalContent.trim()) {
          await fakeStream(finalContent, updateAssistantMessage);
          // Post-stream: stamp the last assistant message as spoiler-blocked so
          // the badge animates in as punctuation after the full response is visible.
          setMessages(prev => {
            const idx = prev.findLastIndex(m => m.role === 'assistant');
            if (idx === -1) return prev;
            return prev.map((m, i) => i === idx ? { ...m, isSpoilerBlocked: true } : m);
          });
        }
      }

    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  }, [setMessages]);

  const clearChat = useCallback(() => {
    setMessages([]);
  }, [setMessages]);

  return {
    messages,
    isLoading,
    error,
    sendMessage,
    clearChat,
    setError
  };
}
