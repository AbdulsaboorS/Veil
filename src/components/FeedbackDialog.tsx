import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { SessionMeta } from '@/lib/types';
import { submitFeedback } from '@/lib/submitFeedback';

interface FeedbackDialogProps {
  meta: SessionMeta | null;
}

type FeedbackType = 'feedback' | 'bug';

export function FeedbackDialog({ meta }: FeedbackDialogProps) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState('');
  const [type, setType] = useState<FeedbackType>('feedback');
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit() {
    if (!text.trim() || isSubmitting) return;
    setIsSubmitting(true);
    try {
      await submitFeedback(text, meta, type);
      toast("Thanks for the feedback!");
      setOpen(false);
      setText('');
      setType('feedback');
    } catch {
      toast.error("Couldn't send feedback — try again");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="text-xs text-muted-foreground/50 hover:text-muted-foreground transition-colors"
      >
        Submit feedback or report a bug
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="w-[320px] sm:max-w-[320px]">
          <DialogHeader>
            <DialogTitle>Submit Feedback</DialogTitle>
          </DialogHeader>

          <div className="flex gap-2 mt-2">
            {(['feedback', 'bug'] as FeedbackType[]).map((t) => (
              <button
                key={t}
                onClick={() => setType(t)}
                className={`flex-1 rounded-md border px-3 py-1.5 text-xs font-medium capitalize transition-colors ${
                  type === t
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'border-border text-muted-foreground hover:text-foreground'
                }`}
              >
                {t === 'feedback' ? 'Feedback' : 'Bug Report'}
              </button>
            ))}
          </div>

          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={type === 'bug' ? 'What went wrong?' : "What's on your mind?"}
            className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm resize-none h-24 mt-1"
          />

          <Button
            onClick={handleSubmit}
            disabled={!text.trim() || isSubmitting}
          >
            {isSubmitting ? 'Sending…' : 'Send'}
          </Button>
        </DialogContent>
      </Dialog>
    </>
  );
}
