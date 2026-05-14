import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ExamplesCarousel } from '@/components/ExamplesCarousel';

describe('ExamplesCarousel', () => {
  it('renders the first example (Tessera) by default', () => {
    render(<ExamplesCarousel />);
    expect(screen.getByText('TESSERA')).toBeInTheDocument();
  });

  it('shows 3 navigation dots labeled by example name', () => {
    render(<ExamplesCarousel />);
    expect(screen.getByLabelText(/Show example 1: Tessera/)).toBeInTheDocument();
    expect(screen.getByLabelText(/Show example 2: Aether-7/)).toBeInTheDocument();
    expect(screen.getByLabelText(/Show example 3: Vesper/)).toBeInTheDocument();
  });

  it('switches to Vesper when 3rd dot is clicked', async () => {
    const user = userEvent.setup();
    render(<ExamplesCarousel />);
    await user.click(screen.getByLabelText(/Show example 3: Vesper/));
    expect(screen.getByText('VESPER')).toBeInTheDocument();
    expect(screen.queryByText('TESSERA')).not.toBeInTheDocument();
  });

  it('switches to Aether-7 when 2nd dot is clicked', async () => {
    const user = userEvent.setup();
    render(<ExamplesCarousel />);
    await user.click(screen.getByLabelText(/Show example 2: Aether-7/));
    expect(screen.getByText('AETHER-7')).toBeInTheDocument();
  });
});
