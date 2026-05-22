import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import Home from '@/app/page';
import fixture from '@/fixtures/tessera.json';
import vesperFixture from '@/fixtures/vesper.json';

// Mock canvas-renderer to avoid canvas in jsdom (html2canvas removed in C1 rewrite)
vi.mock('@/lib/export/canvas-renderer', () => ({
  exportPetCardAsPng: vi.fn().mockResolvedValue(undefined),
  renderPetCardToCanvas: vi.fn(),
}));

describe('Home page paste→render flow', () => {
  it('shows PROMPT block + paste area + empty slot placeholder on first paint', () => {
    render(<Home />);
    expect(screen.getByText(/STEP 1/)).toBeInTheDocument();
    expect(screen.getByLabelText('paste pet json')).toBeInTheDocument();
    // 首屏：没有 pet，显示 PetCardBack 倒扣卡背
    expect(screen.getByText(/pack unopened/i)).toBeInTheDocument();
    expect(screen.getByText(/paste json to summon/i)).toBeInTheDocument();
    // 确认 carousel 行为已被移除：没有任何示例 pet 名
    expect(screen.queryByText('TESSERA')).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/Show example/)).not.toBeInTheDocument();
  });

  it('replaces empty slot with user pet when valid JSON is pasted', () => {
    render(<Home />);
    fireEvent.change(screen.getByLabelText('paste pet json'), {
      target: { value: JSON.stringify(vesperFixture) },
    });
    // 用户卡片出现
    expect(screen.getByText('VESPER')).toBeInTheDocument();
    // PetCardBack 占位应该消失
    expect(screen.queryByText(/pack unopened/i)).not.toBeInTheDocument();
  });

  it('keeps user pet visible when JSON becomes invalid', () => {
    render(<Home />);
    const ta = screen.getByLabelText('paste pet json');
    fireEvent.change(ta, { target: { value: JSON.stringify(fixture) } });
    expect(screen.getByText('TESSERA')).toBeInTheDocument();
    // 改坏 → 错误显示但卡片仍在
    fireEvent.change(ta, { target: { value: 'broken { not json' } });
    expect(screen.getByRole('alert')).toBeInTheDocument();
    expect(screen.getByText('TESSERA')).toBeInTheDocument();
  });

  it('returns to empty slot when textarea is cleared', () => {
    render(<Home />);
    const ta = screen.getByLabelText('paste pet json');
    fireEvent.change(ta, { target: { value: JSON.stringify(vesperFixture) } });
    expect(screen.getByText('VESPER')).toBeInTheDocument();
    fireEvent.change(ta, { target: { value: '' } });
    // 回到 PetCardBack 占位（而不是 carousel）
    expect(screen.getByText(/pack unopened/i)).toBeInTheDocument();
    expect(screen.queryByText('VESPER')).not.toBeInTheDocument();
  });
});
