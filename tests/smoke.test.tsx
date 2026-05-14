import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';

describe('toolchain smoke', () => {
  it('renders span', () => {
    render(<span>hello arena</span>);
    expect(screen.getByText('hello arena')).toBeInTheDocument();
  });
});
