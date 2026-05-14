import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PromptBlock } from '@/components/PromptBlock';

vi.mock('@/lib/clipboard', () => ({
  copyToClipboard: vi.fn().mockResolvedValue(true),
}));
import { copyToClipboard } from '@/lib/clipboard';

describe('PromptBlock', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (copyToClipboard as ReturnType<typeof vi.fn>).mockResolvedValue(true);
  });

  it('renders STEP 1 header and 3-step hint', () => {
    render(<PromptBlock />);
    expect(screen.getByText(/STEP 1/)).toBeInTheDocument();
    expect(screen.getByText(/Copy.*Paste.*JSON/)).toBeInTheDocument();
  });

  it('starts collapsed (prompt body hidden)', () => {
    render(<PromptBlock />);
    expect(screen.queryByText(/recent_chats/)).not.toBeInTheDocument();
  });

  it('expands prompt body on header click', async () => {
    const user = userEvent.setup();
    render(<PromptBlock />);
    await user.click(screen.getByText(/STEP 1/));
    expect(screen.getByText(/recent_chats/)).toBeInTheDocument();
  });

  it('shows ✓ Copied toast after successful copy', async () => {
    const user = userEvent.setup();
    render(<PromptBlock />);
    await user.click(screen.getByRole('button', { name: /Copy Prompt/i }));
    expect(copyToClipboard).toHaveBeenCalledOnce();
    expect(await screen.findByText(/Copied/)).toBeInTheDocument();
  });

  it('shows fail toast when clipboard returns false', async () => {
    (copyToClipboard as ReturnType<typeof vi.fn>).mockResolvedValueOnce(false);
    const user = userEvent.setup();
    render(<PromptBlock />);
    await user.click(screen.getByRole('button', { name: /Copy Prompt/i }));
    expect(await screen.findByText(/Failed/)).toBeInTheDocument();
  });
});
