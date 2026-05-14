import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { JsonPaster } from '@/components/JsonPaster';
import tessera from '@/fixtures/tessera.json';

const validJson = JSON.stringify(tessera);

describe('JsonPaster', () => {
  it('calls onParsed with pet on valid JSON', () => {
    const onParsed = vi.fn();
    render(<JsonPaster onParsed={onParsed} />);
    const ta = screen.getByLabelText('paste pet json');
    fireEvent.change(ta, { target: { value: validJson } });
    expect(onParsed).toHaveBeenCalledOnce();
    expect(onParsed.mock.calls[0][0].name).toBe('Tessera');
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('accepts JSON wrapped in markdown fence', () => {
    const onParsed = vi.fn();
    render(<JsonPaster onParsed={onParsed} />);
    fireEvent.change(screen.getByLabelText('paste pet json'), {
      target: { value: '```json\n' + validJson + '\n```' },
    });
    expect(onParsed).toHaveBeenCalledOnce();
  });

  it('shows json_error and does NOT call onParsed for broken JSON', () => {
    const onParsed = vi.fn();
    render(<JsonPaster onParsed={onParsed} />);
    fireEvent.change(screen.getByLabelText('paste pet json'), {
      target: { value: '{ broken' },
    });
    expect(onParsed).not.toHaveBeenCalled();
    expect(screen.getByRole('alert').textContent).toMatch(/JSON/);
  });

  it('shows schema_error and does NOT call onParsed for valid-but-incomplete JSON', () => {
    const onParsed = vi.fn();
    render(<JsonPaster onParsed={onParsed} />);
    fireEvent.change(screen.getByLabelText('paste pet json'), {
      target: { value: '{"name":"x"}' },
    });
    expect(onParsed).not.toHaveBeenCalled();
    expect(screen.getByRole('alert').textContent).toMatch(/字段校验/);
  });

  it('calls onParsed(null) and clears error when textarea is emptied', () => {
    const onParsed = vi.fn();
    render(<JsonPaster onParsed={onParsed} />);
    const ta = screen.getByLabelText('paste pet json');
    fireEvent.change(ta, { target: { value: '   ' } });
    expect(onParsed).toHaveBeenCalledWith(null);
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('preserves previous pet on parse failure (does NOT call onParsed(null))', () => {
    const onParsed = vi.fn();
    render(<JsonPaster onParsed={onParsed} />);
    const ta = screen.getByLabelText('paste pet json');
    // 第一次：成功
    fireEvent.change(ta, { target: { value: validJson } });
    expect(onParsed).toHaveBeenLastCalledWith(expect.objectContaining({ name: 'Tessera' }));
    onParsed.mockClear();
    // 第二次：换成纯 prose（无 JSON 结构）—不该调 onParsed
    fireEvent.change(ta, { target: { value: 'hello world no json here' } });
    expect(onParsed).not.toHaveBeenCalled();
  });
});
