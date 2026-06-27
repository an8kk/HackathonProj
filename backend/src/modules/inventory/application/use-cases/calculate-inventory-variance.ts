import { resolveVarianceRisk, type VarianceRiskLevel } from '../../domain/services/variance-risk-policy.js';
import { assertNonNegativeQuantity } from '../../domain/value-objects/inventory-quantity.js';

export type CalculateInventoryVarianceInput = {
  openingStock: number;
  purchases: number;
  closingStock: number;
  salesUsage: number;
  unitCost: number;
};

export type InventoryVarianceReport = {
  actualUsage: number;
  theoreticalUsage: number;
  quantityVariance: number;
  costVariance: number;
  variancePercent: number;
  riskLevel: VarianceRiskLevel;
};

export const calculateInventoryVariance = (input: CalculateInventoryVarianceInput): InventoryVarianceReport => {
  const openingStock = assertNonNegativeQuantity(input.openingStock, 'openingStock');
  const purchases = assertNonNegativeQuantity(input.purchases, 'purchases');
  const closingStock = assertNonNegativeQuantity(input.closingStock, 'closingStock');
  const theoreticalUsage = assertNonNegativeQuantity(input.salesUsage, 'salesUsage');
  const unitCost = assertNonNegativeQuantity(input.unitCost, 'unitCost');

  const actualUsage = openingStock + purchases - closingStock;
  const quantityVariance = actualUsage - theoreticalUsage;
  const variancePercent = theoreticalUsage === 0 ? 0 : (quantityVariance / theoreticalUsage) * 100;

  return {
    actualUsage,
    theoreticalUsage,
    quantityVariance,
    costVariance: quantityVariance * unitCost,
    variancePercent,
    riskLevel: resolveVarianceRisk(variancePercent)
  };
};
