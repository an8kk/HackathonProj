export type VarianceRiskLevel = 'normal' | 'warning' | 'critical';

export const resolveVarianceRisk = (variancePercent: number): VarianceRiskLevel => {
  const absoluteVariance = Math.abs(variancePercent);

  if (absoluteVariance > 5) {
    return 'critical';
  }

  if (absoluteVariance > 3) {
    return 'warning';
  }

  return 'normal';
};
