import { describe, it, expect, vi } from 'vitest';
import { render, fireEvent, screen } from '@testing-library/react';
import { JsonPaster } from '@/components/JsonPaster';
import tessera from '@/fixtures/tessera.json';

const validJson = JSON.stringify(tessera);

describe('JsonPaster · onUploadable callback', () => {
  it('fires onUploadable with parsed pet on valid JSON', () => {
    const onUploadable = vi.fn();
    render(<JsonPaster onParsed={() => {}} onUploadable={onUploadable} />);
    fireEvent.change(screen.getByLabelText('paste pet json'), { target: { value: validJson } });
    expect(onUploadable).toHaveBeenCalledOnce();
    expect(onUploadable.mock.calls[0][0].name).toBe('Tessera');
  });

  it('does NOT fire onUploadable on parse error', () => {
    const onUploadable = vi.fn();
    render(<JsonPaster onParsed={() => {}} onUploadable={onUploadable} />);
    fireEvent.change(screen.getByLabelText('paste pet json'), { target: { value: '{broken' } });
    expect(onUploadable).not.toHaveBeenCalled();
  });

  it('does NOT fire onUploadable when textarea emptied', () => {
    const onUploadable = vi.fn();
    render(<JsonPaster onParsed={() => {}} onUploadable={onUploadable} />);
    fireEvent.change(screen.getByLabelText('paste pet json'), { target: { value: '' } });
    expect(onUploadable).not.toHaveBeenCalled();
  });

  it('works when onUploadable is undefined (backward compat)', () => {
    expect(() => {
      render(<JsonPaster onParsed={() => {}} />);
      fireEvent.change(screen.getByLabelText('paste pet json'), { target: { value: validJson } });
    }).not.toThrow();
  });
});
