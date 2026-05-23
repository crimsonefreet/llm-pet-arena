import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ConsentModal } from '@/components/social/ConsentModal';

describe('ConsentModal', () => {
  it('does NOT render when open=false', () => {
    render(<ConsentModal open={false} onAccept={() => {}} onDecline={() => {}} />);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('renders as modal dialog when open=true', () => {
    render(<ConsentModal open onAccept={() => {}} onDecline={() => {}} />);
    const dialog = screen.getByRole('dialog');
    expect(dialog).toHaveAttribute('aria-modal', 'true');
  });

  it('mentions public pool + evidence-local in body text', () => {
    render(<ConsentModal open onAccept={() => {}} onDecline={() => {}} />);
    expect(screen.getByText(/public battle pool/i)).toBeInTheDocument();
    expect(screen.getByText(/never leaves your browser/i)).toBeInTheDocument();
  });

  it('fires onAccept when Join button clicked', async () => {
    const user = userEvent.setup();
    const onAccept = vi.fn();
    render(<ConsentModal open onAccept={onAccept} onDecline={() => {}} />);
    await user.click(screen.getByRole('button', { name: /Join the Arena/i }));
    expect(onAccept).toHaveBeenCalledOnce();
  });

  it('fires onDecline when Keep Local Only button clicked', async () => {
    const user = userEvent.setup();
    const onDecline = vi.fn();
    render(<ConsentModal open onAccept={() => {}} onDecline={onDecline} />);
    await user.click(screen.getByRole('button', { name: /Keep Local Only/i }));
    expect(onDecline).toHaveBeenCalledOnce();
  });
});
