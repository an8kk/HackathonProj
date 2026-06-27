export type InventoryQuantity = number;

export const assertNonNegativeQuantity = (value: number, fieldName: string): InventoryQuantity => {
  if (!Number.isFinite(value) || value < 0) {
    throw new Error(`${fieldName} must be a finite non-negative number`);
  }

  return value;
};
