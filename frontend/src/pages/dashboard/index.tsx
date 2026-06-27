import { VarianceSummary } from 'widgets/variance-summary';
import { WriteOffsList } from 'widgets/write-offs-list';

export const DashboardPage = () => (
  <main className="page-shell">
    <div className="hero">
      <div className="card card--dark hero-main">
        <p className="eyebrow">Bahandi loss intelligence</p>
        <h1>Operations cockpit</h1>
        <p className="lead">
          Waste photos, AvT variance, employee patterns, QR evidence, and inventory signals across
          fast-food branches — one workspace.
        </p>
        <div className="metrics-row">
          <div className="metric">
            <span className="metric__label">Actual vs Theoretical</span>
            <span className="metric__value">AvT</span>
          </div>
          <div className="metric">
            <span className="metric__label">Photo evidence</span>
            <span className="metric__value">AI</span>
          </div>
          <div className="metric">
            <span className="metric__label">Branch control</span>
            <span className="metric__value">KPI</span>
          </div>
        </div>
      </div>

      <VarianceSummary />
    </div>

    <WriteOffsList />
  </main>
);
