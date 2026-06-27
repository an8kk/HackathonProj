import { inventoryVariancePreview } from 'entities/inventory';

export const VarianceSummary = () => (
  <aside className="card card--dark variance-card" aria-label="Variance summary">
    <div className="variance-card__tag">
      <span className="variance-card__tag-dot" />
      Live variance watch
    </div>
    <h2>Critical variance watch</h2>
    <p>
      Start with raw waste and completed waste reasons before blaming staff.
      Check employee shift patterns.
    </p>
    <div className="variance-card__stat">
      <span className="variance-card__stat-label">{inventoryVariancePreview.branchName}</span>
      <span className="variance-card__stat-value">+{inventoryVariancePreview.variancePercent}%</span>
    </div>
  </aside>
);
