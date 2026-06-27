import { VarianceSummary } from 'widgets/variance-summary';

export const DashboardPage = () => (
  <main className="page-shell">
    <section className="hero">
      <div className="card">
        <p className="eyebrow">Bahandi loss intelligence</p>
        <h1>Operations cockpit</h1>
        <p className="lead">
          One workspace for waste photos, Actual vs Theoretical variance, employee patterns,
          QR-backed evidence, and inventory signals across fast-food branches.
        </p>
        <div className="grid" aria-label="Product pillars">
          <div className="metric">
            <span>Actual vs Theoretical</span>
            <strong>AvT</strong>
          </div>
          <div className="metric">
            <span>Photo evidence</span>
            <strong>AI-ready</strong>
          </div>
          <div className="metric">
            <span>Branch control</span>
            <strong>KPI</strong>
          </div>
        </div>
      </div>
      <VarianceSummary />
    </section>
  </main>
);
