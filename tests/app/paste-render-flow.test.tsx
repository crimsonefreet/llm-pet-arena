import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import Home from '@/app/page';
import fixture from '@/fixtures/tessera.json';
import vesperFixture from '@/fixtures/vesper.json';

// Mock html2canvas to avoid canvas in jsdom
vi.mock('html2canvas', () => ({ default: vi.fn() }));

describe('Home page paste→render flow', () => {
  it('shows PROMPT block + paste area + carousel default Tessera', () => {
    render(<Home />);
    expect(screen.getByText(/STEP 1/)).toBeInTheDocument();
    expect(screen.getByLabelText('paste pet json')).toBeInTheDocument();
    // 轮播默认第一张
    expect(screen.getByText('TESSERA')).toBeInTheDocument();
  });

  it('replaces carousel with user pet when valid JSON is pasted', () => {
    render(<Home />);
    fireEvent.change(screen.getByLabelText('paste pet json'), {
      target: { value: JSON.stringify(vesperFixture) },
    });
    // 用户卡片出现
    expect(screen.getByText('VESPER')).toBeInTheDocument();
    // 轮播 dots 应该消失（因为 carousel section is conditional on !pet）
    expect(screen.queryByLabelText(/Show example 1/)).not.toBeInTheDocument();
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

  it('returns to carousel when textarea is cleared', () => {
    render(<Home />);
    const ta = screen.getByLabelText('paste pet json');
    fireEvent.change(ta, { target: { value: JSON.stringify(vesperFixture) } });
    expect(screen.getByText('VESPER')).toBeInTheDocument();
    fireEvent.change(ta, { target: { value: '' } });
    // 回到轮播：dots 重新出现
    expect(screen.getByLabelText(/Show example 1/)).toBeInTheDocument();
    expect(screen.getByText('TESSERA')).toBeInTheDocument();
  });
});
