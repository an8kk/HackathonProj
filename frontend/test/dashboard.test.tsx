import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { App } from '../src/app/App';

describe('App', () => {
  it('shows the Qamqor demo role picker', () => {
    render(<App />);

    expect(screen.getByRole('heading', { name: /Qamqor/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Сотрудник/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Менеджер/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Владелец/i })).toBeInTheDocument();
  });
});
