import { inventoryVariancePreview } from 'entities/inventory';

export const VarianceSummary = () => (
  <aside className="card stack" aria-label="Variance summary">
    <span className="pill">DDD backend ready</span>
    <h2>Critical variance watch</h2>
    <p>
      {inventoryVariancePreview.branchName} is {inventoryVariancePreview.variancePercent}% above
      theoretical usage. Start with raw waste and completed waste reasons before blaming staff.
    </p>
  </aside>
);
