import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { HttpDataSource } from '../src/shared/qamqor-data/httpDataSource';

// Small real-shaped backend dataset. created_at is "yesterday" so it lands in
// every period window (today excluded, but week/month/quarter include it).
const yesterday = new Date(Date.now() - 86_400_000).toISOString();

const outlets = [
  { id: 'o1', name: 'Alpha', address: 'addr1', iiko_store_id: null },
  { id: 'o2', name: 'Beta', address: 'addr2', iiko_store_id: null },
];
const products = [
  { id: 'p1', name: 'Tomato', unit: 'граммы', cost_per_unit: 2, iiko_product_id: null },
  { id: 'p2', name: 'Patty', unit: 'штуки', cost_per_unit: 100, iiko_product_id: null },
];
const employees = [
  { id: 'e1', name: 'Asan', role: 'sender', active: true, outlet: outlets[0], outlet_id: 'o1' },
  { id: 'e2', name: 'Bota', role: 'sender', active: true, outlet: outlets[1], outlet_id: 'o2' },
];
const norms = [
  { id: 'n1', product_id: 'p1', outlet_id: null, max_waste_pct: 10, effective_from: null, effective_to: null },
  { id: 'n2', product_id: 'p2', outlet_id: null, max_waste_pct: 3, effective_from: null, effective_to: null },
];
function wo(over: Record<string, unknown>) {
  return {
    id: 'x', outlet_id: 'o1', employee_id: 'e1', product_id: 'p1', photo_id: null,
    quantity: 1, unit: 'граммы', reason_code: 'RAW_WASTE', deduction_type: 'NO_DEDUCTION',
    charged_employee_id: null, comment: 'demo demo', status: 'approved', reviewer_id: null,
    rejection_reason: null, reviewed_at: null, created_at: yesterday,
    iiko_sync: { status: 'pending', external_id: null, error: null }, ...over,
  };
}
const writeOffs = [
  wo({ id: 'w1', outlet_id: 'o1', product_id: 'p1', quantity: 5, reason_code: 'RAW_WASTE', status: 'approved' }), // cost 10
  wo({ id: 'w2', outlet_id: 'o1', product_id: 'p2', quantity: 2, reason_code: 'DAMAGED', status: 'approved' }), // cost 200
  wo({ id: 'w3', outlet_id: 'o2', employee_id: 'e2', product_id: 'p1', quantity: 10, reason_code: 'RAW_WASTE', status: 'approved' }), // cost 20
  wo({ id: 'w4', outlet_id: 'o1', product_id: 'p1', quantity: 3, reason_code: 'RAW_WASTE', status: 'rejected' }), // excluded from declared
];
const reconciliation = [
  { outlet_id: 'o1', product_id: 'p1', product_name: 'Tomato', theoretical_balance: 1000, actual_balance: 980, write_off_total: 8, unexplained_variance: -20 },
  { outlet_id: 'o1', product_id: 'p2', product_name: 'Patty', theoretical_balance: 500, actual_balance: 498, write_off_total: 2, unexplained_variance: 0 },
  { outlet_id: 'o2', product_id: 'p1', product_name: 'Tomato', theoretical_balance: 1000, actual_balance: 990, write_off_total: 10, unexplained_variance: -10 },
];

const ROUTES: Array<[string, unknown]> = [
  ['/inventory/reconciliation', reconciliation],
  ['/analytics/investigations', []],
  ['/write-offs', writeOffs],
  ['/outlets', outlets],
  ['/employees', employees],
  ['/products', products],
  ['/norms', norms],
];

beforeEach(() => {
  vi.stubGlobal('fetch', vi.fn(async (url: string) => {
    const u = String(url);
    const hit = ROUTES.find(([path]) => u.includes(path));
    const data = hit ? hit[1] : [];
    return { ok: true, status: 200, text: async () => JSON.stringify({ success: true, data }) } as Response;
  }));
});
afterEach(() => vi.unstubAllGlobals());

describe('HttpDataSource', () => {
  it('computes per-location deficit from real records', async () => {
    const source = new HttpDataSource();
    const locations = await source.getLocations('quarter');

    const o1 = locations.find((l) => l.locationId === 'o1');
    expect(o1).toBeDefined();
    // declared = approved cost only (w1 10 + w2 200), rejected w4 excluded
    expect(o1!.declaredWriteOffs).toBe(210);
    // unexplained = |−20|*2 (p1) + 0 (p2) = 40
    expect(o1!.unexplainedDeficit).toBe(40);
    expect(o1!.actualDeficit).toBe(250);
    // variance = 40 / (1000*2 + 500*100) * 100 = 0.0769 → 0.1
    expect(o1!.variancePercent).toBeCloseTo(0.1, 5);
    expect(o1!.status).toBe('green');
  });

  it('rolls network KPI unexplained deficit across outlets', async () => {
    const source = new HttpDataSource();
    const kpis = await source.getNetworkKpis('quarter');
    // o1 40 + o2 (|−10|*2) 20 = 60
    expect(kpis.unexplainedDeficit.value).toBe(60);
  });

  it('computes product waste rate vs norm from reconciliation', async () => {
    const source = new HttpDataSource();
    const waste = await source.getProductWaste('quarter');

    const tomato = waste.find((w) => w.product === 'Tomato');
    expect(tomato).toBeDefined();
    expect(tomato!.norm).toBe(10);
    // network declared = (8 + 10) / (1000 + 1000) * 100 = 0.9
    expect(tomato!.declared).toBeCloseTo(0.9, 5);
    // worst outlet o2: 10/1000*100 = 1.0
    expect(tomato!.worstLocation).toBeCloseTo(1.0, 5);
    expect(tomato!.worstLocationName).toBe('Beta');
  });
});
