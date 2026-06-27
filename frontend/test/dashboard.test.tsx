import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { App } from '../src/app/App';

describe('App', () => {
  it('shows the operations cockpit entry point', () => {
    render(<App />);

    expect(screen.getByRole('heading', { name: /Operations cockpit/i })).toBeInTheDocument();
    const productPillars = screen.getByLabelText('Product pillars');

    expect(within(productPillars).getByText(/Actual vs Theoretical/i)).toBeInTheDocument();
    expect(within(productPillars).getByText(/Photo evidence/i)).toBeInTheDocument();
  });
});
