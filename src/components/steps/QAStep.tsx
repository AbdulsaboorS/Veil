import { type RefObject } from 'react';
import { Button } from '@/components/ui/button';
import { ChatStatusBar } from '@/components/ChatStatusBar';
import { FeedbackDialog } from '@/components/FeedbackDialog';
import { Loader2, ArrowUp } from 'lucide-react';
import { ChatMessage, SessionMeta, InitPhase } from '@/lib/types';

interface QAStepProps {
  messages: ChatMessage[];
  isLoading: boolean;
  error: string | null;
  question: string;
  hasAnswer: boolean;
  meta?: SessionMeta | null;
  isLoadingRecap?: boolean;
  phase?: InitPhase;
  context?: string;
  qaHistoryRef: RefObject<HTMLDivElement>;
  onQuestionChange: (q: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  onClearChat?: () => void;
  onEditContext?: () => void;
}

export function QAStep({
  messages,
  isLoading,
  error,
  question,
  meta,
  isLoadingRecap = false,
  phase,
  context,
  qaHistoryRef,
  onQuestionChange,
  onSubmit,
  onClearChat,
  onEditContext,
}: QAStepProps) {
  const effectiveContext = meta?.context ?? context ?? '';
  const isContextMissing = !effectiveContext.trim();
  const isInputDisabled = isLoading || isLoadingRecap;

  // Legacy web-app path
  if (isContextMissing && onEditContext && !meta) {
    return (
      <div className="rounded-lg border border-destructive/20 bg-destructive/10 p-4 space-y-3">
        <div className="text-sm font-medium text-destructive">Context Required</div>
        <p className="text-xs text-muted-foreground">
          Episode context is required to ask questions safely. Please provide a recap or summary.
        </p>
        <Button onClick={onEditContext} variant="outline" size="sm" className="w-full h-9 text-sm">
          Edit Context
        </Button>
      </div>
    );
  }

  const placeholder = meta?.showTitle
    ? `Ask about ${meta.showTitle}…`
    : 'Ask a question…';

  // Show typing dots when loading but no assistant reply in flight yet
  const showTypingIndicator =
    isLoading &&
    (messages.length === 0 || messages[messages.length - 1].role === 'user');

  return (
    <div className="flex flex-col gap-3">

      {/* ── Message list ───────────────────────────────────────────── */}
      <div
        ref={qaHistoryRef}
        className="space-y-2 max-h-[420px] overflow-y-auto px-1 pb-1 scroll-smooth"
      >
        {messages.length === 0 && !isLoading ? (
          /* Empty state */
          <div className="flex flex-col items-center justify-center py-10 gap-2 text-center select-none">
            <p className="text-2xl">💬</p>
            <p className="text-sm text-muted-foreground">
              Ask anything — I've got your back
            </p>
          </div>
        ) : (
          <>
            {/* Clear chat — subtle, centred above messages */}
            {onClearChat && messages.length > 0 && (
              <div className="flex justify-center pb-1">
                <button
                  onClick={onClearChat}
                  className="text-xs text-muted-foreground/50 hover:text-muted-foreground transition-colors"
                >
                  Clear chat
                </button>
              </div>
            )}

            {/* Bubbles */}
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex flex-col animate-bubble-pop ${
                  msg.role === 'user' ? 'items-end' : 'items-start'
                }`}
              >
                <div
                  className={`max-w-[85%] px-4 py-2.5 text-sm leading-relaxed whitespace-pre-wrap ${
                    msg.role === 'user'
                      ? 'bg-primary text-primary-foreground rounded-2xl rounded-br-[4px]'
                      : 'bg-secondary text-foreground rounded-2xl rounded-bl-[4px]'
                  }`}
                >
                  {msg.content}
                </div>
                {msg.role === 'assistant' && msg.isSpoilerBlocked && (
                  <span
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium mt-1.5 animate-shield-pop pointer-events-none select-none"
                    style={{
                      background: 'linear-gradient(135deg, hsl(var(--primary) / 0.2), hsl(var(--primary) / 0.1))',
                      border: '1px solid hsl(var(--primary) / 0.3)',
                      color: 'hsl(var(--primary))',
                    }}
                  >
                    🛡️ Spoiler Blocked
                  </span>
                )}
              </div>
            ))}

            {/* Typing indicator */}
            {showTypingIndicator && (
              <div className="flex justify-start animate-bubble-pop">
                <div className="bg-secondary rounded-2xl rounded-bl-[4px] px-4 py-3.5 flex gap-1.5 items-center">
                  {[0, 150, 300].map((delay) => (
                    <span
                      key={delay}
                      className="w-1.5 h-1.5 rounded-full bg-muted-foreground animate-dot-bounce"
                      style={{ animationDelay: `${delay}ms` }}
                    />
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* ── Status bar ─────────────────────────────────────────────── */}
      {meta !== undefined && (
        <ChatStatusBar
          meta={meta ?? null}
          isLoadingRecap={isLoadingRecap}
          phase={phase ?? 'ready'}
        />
      )}

      {/* ── Pill input ─────────────────────────────────────────────── */}
      <form onSubmit={onSubmit} className="relative">
        <input
          value={question}
          onChange={(e) => onQuestionChange(e.target.value)}
          placeholder={placeholder}
          disabled={isInputDisabled}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              const form = e.currentTarget.closest('form');
              if (form) form.requestSubmit();
            }
          }}
          className="w-full bg-card border border-border rounded-full px-5 py-3 pr-12 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none transition-shadow duration-200 focus:shadow-[0_0_0_1px_hsl(var(--primary)/0.4),_0_0_16px_hsl(var(--primary)/0.15)] disabled:opacity-50"
        />
        <button
          type="submit"
          disabled={isInputDisabled || !question.trim()}
          className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-primary flex items-center justify-center disabled:opacity-25 transition-all duration-150 hover:scale-105 hover:shadow-[0_0_12px_hsl(var(--primary)/0.5)]"
        >
          {isLoading
            ? <Loader2 className="w-4 h-4 animate-spin text-primary-foreground" />
            : <ArrowUp className="w-4 h-4 text-primary-foreground" />
          }
        </button>
      </form>

      <div className="flex justify-center pt-0.5">
        <FeedbackDialog meta={meta ?? null} />
      </div>

      {error && (
        <div className="text-xs text-destructive px-1">{error}</div>
      )}
    </div>
  );
}
