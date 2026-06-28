import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import { AppProvider } from '../src/shared/qamqor-context/AppContext';
import { DashboardProvider } from '../src/shared/qamqor-context/DashboardContext';
import OverviewView from '../src/shared/qamqor-dashboard/views/OverviewView';
import { renderWithProviders } from './test-utils';

function jsonResponse(body: unknown): Response {
  return {
    ok: true,
    status: 200,
    text: async () => JSON.stringify(body),
  } as unknown as Response;
}

const summary = {
  total_requests: 4242,
  pending: 313,
  approved: 3737,
  rejected: 191,
  approved_cost_value: 9876543,
};

describe('Dashboard overview — real stats', () => {
  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem('qamqor_token', 'jwt-owner');
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: unknown) => {
        if (String(url).includes('/analytics/summary')) {
          return jsonResponse({ success: true, data: summary });
        }
        return jsonResponse({ success: true, data: [] });
      }),
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders headline cards from /analytics/summary', async () => {
    renderWithProviders(
      <AppProvider>
        <DashboardProvider>
          <OverviewView onOpenLocation={() => {}} onOpenEmployee={() => {}} onNavigate={() => {}} />
        </DashboardProvider>
      </AppProvider>,
    );

    await waitFor(() => {
      expect(screen.getByText('4242')).toBeInTheDocument();
    });
    expect(screen.getByText('313')).toBeInTheDocument();
    expect(screen.getByText('3737')).toBeInTheDocument();
    expect(screen.getByText('191')).toBeInTheDocument();
  });
});
