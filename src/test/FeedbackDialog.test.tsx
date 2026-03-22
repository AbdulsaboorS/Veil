import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { FeedbackDialog } from '@/components/FeedbackDialog';

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

describe('FeedbackDialog', () => {
  it('renders a trigger button in the document', () => {
    render(<FeedbackDialog meta={mockMeta} />);
    expect(screen.getByRole('button', { name: /feedback/i })).toBeInTheDocument();
  });

  it('opens the dialog when trigger is clicked', async () => {
    render(<FeedbackDialog meta={mockMeta} />);
    fireEvent.click(screen.getByRole('button', { name: /feedback/i }));
    expect(await screen.findByRole('dialog')).toBeInTheDocument();
  });

  it('shows a textarea inside the dialog', async () => {
    render(<FeedbackDialog meta={mockMeta} />);
    fireEvent.click(screen.getByRole('button', { name: /feedback/i }));
    expect(await screen.findByRole('textbox')).toBeInTheDocument();
  });
});
