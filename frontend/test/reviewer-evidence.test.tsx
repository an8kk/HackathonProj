import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, screen, waitFor } from '@testing-library/react';
import QamqorManager from '../src/pages/qamqor-manager';
import { renderWithProviders } from './test-utils';

function jsonResponse(body: unknown): Response {
  return {
    ok: true,
    status: 200,
    text: async () => JSON.stringify(body),
  } as unknown as Response;
}

const product = { id: 'p1', name: 'Помидор', unit: 'граммы', cost_per_unit: 1.2, iiko_product_id: null };

const pendingWriteOff = {
  id: 'wo1',
  outlet_id: 'mega',
  employee_id: 'emp-1',
  product_id: 'p1',
  photo_id: 'ph1',
  quantity: 500,
  unit: 'граммы',
  reason_code: 'EXPIRED',
  deduction_type: 'NO_DEDUCTION',
  charged_employee_id: null,
  comment: 'Помидоры испортились на складе',
  status: 'pending',
  reviewer_id: null,
  rejection_reason: null,
  reviewed_at: null,
  created_at: '2026-06-28T10:00:00Z',
  iiko_sync: { status: 'pending', external_id: null, error: null },
};

const photo = {
  id: 'ph1',
  filename: 'tomato.jpg',
  storage_key: 'photos/ph1.jpg',
  content_type: 'image/jpeg',
  sha256_hash: 'abc',
  perceptual_hash: null,
  taken_at: null,
  uploaded_at: '2026-06-28T10:00:00Z',
  metadata_status: 'valid',
  validation_errors: [],
  ai_analysis: {
    is_food_waste: true,
    detected_product: 'Помидоры черри',
    confidence: 0.92,
    condition: 'spoiled',
    suggested_reason: 'EXPIRED',
    fraud_warnings: ['reused_image'],
    reviewer_note: 'Похоже на испорченный продукт',
  },
};

const iikoStatus = {
  iiko_web: { provider: 'iikoWeb', configured: false, base_url: null, supported_endpoints: ['stores'], write_off_act_endpoint_available: false },
  iiko_server: { provider: 'iiko Server', configured: false, base_url: null, write_off_act_endpoint: '/resto/api/documents/import/writeoffDocument', write_off_act_endpoint_available: false },
  note: 'demo',
};

const summary = { total_requests: 1, pending: 1, approved: 0, rejected: 0, approved_cost_value: 0 };

function routedFetch(url: string): Response {
  if (url.includes('/integrations/iiko/status')) return jsonResponse({ success: true, data: iikoStatus });
  if (url.includes('/analytics/summary')) return jsonResponse({ success: true, data: summary });
  if (url.includes('/photos/ph1')) return jsonResponse({ success: true, data: photo });
  if (url.includes('/products')) return jsonResponse({ success: true, data: [product] });
  if (url.includes('/employees')) return jsonResponse({ success: true, data: [] });
  if (url.includes('/outlets')) return jsonResponse({ success: true, data: [] });
  if (url.includes('/write-offs')) return jsonResponse({ success: true, data: [pendingWriteOff] });
  return jsonResponse({ success: true, data: [] });
}

describe('Reviewer photo evidence', () => {
  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem('qamqor_token', 'jwt-reviewer');
    localStorage.setItem(
      'qamqor_user',
      JSON.stringify({ id: 'rev-9', name: 'Проверяющий', role: 'reviewer', active: true, outlet: null, outlet_id: null }),
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('shows the AI verdict and metadata status for a pending request', async () => {
    const fetchMock = vi.fn(async (url: unknown) => routedFetch(String(url)));
    vi.stubGlobal('fetch', fetchMock);

    renderWithProviders(<QamqorManager />);

    await waitFor(() => {
      expect(screen.getByText('Помидор')).toBeInTheDocument();
    });

    // Evidence (incl. usePhoto) is only mounted once the card is expanded.
    fireEvent.click(screen.getByRole('button', { name: /Подробнее/i }));

    await waitFor(() => {
      expect(screen.getByText('Помидоры черри')).toBeInTheDocument();
      expect(screen.getByText('метаданные в норме')).toBeInTheDocument();
    });

    const photoCall = fetchMock.mock.calls.find(call => String(call[0]).includes('/photos/ph1'));
    expect(photoCall).toBeDefined();
    const img = screen.getByAltText('Фото списания') as HTMLImageElement;
    expect(img.src).toContain('/media/photos/ph1.jpg');
  });
});
