import { useState } from 'react';
import { MessageSquare } from 'lucide-react';
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

export function FeedbackDialog({ meta }: FeedbackDialogProps) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit() {
    if (!text.trim() || isSubmitting) return;
    setIsSubmitting(true);
    try {
      await submitFeedback(text, meta);
      toast("Thanks for the feedback!");
      setOpen(false);
      setText('');
    } catch {
      toast.error("Couldn't send feedback — try again");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setOpen(true)}
        className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
        aria-label="Send feedback"
      >
        <MessageSquare className="w-4 h-4" />
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="w-[320px] sm:max-w-[320px]">
          <DialogHeader>
            <DialogTitle>Send Feedback</DialogTitle>
          </DialogHeader>

          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="What's on your mind?"
            className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm resize-none h-24 mt-2"
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
