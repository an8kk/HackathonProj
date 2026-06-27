import { describe, expect, it } from 'vitest';
import { calculateInventoryVariance } from '../src/modules/inventory/application/use-cases/calculate-inventory-variance.js';

describe('calculateInventoryVariance', () => {
  it('compares theoretical usage with actual usage and flags waste risk', () => {
    const report = calculateInventoryVariance({
      openingStock: 100,
      purchases: 40,
      closingStock: 30,
      salesUsage: 104,
      unitCost: 850
    });

    expect(report.actualUsage).toBe(110);
    expect(report.quantityVariance).toBe(6);
    expect(report.costVariance).toBe(5100);
    expect(report.variancePercent).toBeCloseTo(5.77, 2);
    expect(report.riskLevel).toBe('critical');
  });
});
