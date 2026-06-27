import { useWriteOffs } from 'features/write-offs/use-write-offs';
import { REASON_LABELS, STATUS_LABELS } from 'entities/write-off';
import type { WriteOff } from 'entities/write-off';
import './styles.css';

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
}

function formatElapsed(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins} мин назад`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} ч назад`;
  return `${Math.floor(hrs / 24)} дн назад`;
}

function reviewTime(wo: WriteOff): string | null {
  if (!wo.reviewedAt || !wo.createdAt) return null;
  const diff = new Date(wo.reviewedAt).getTime() - new Date(wo.createdAt).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins} мин`;
  return `${Math.floor(mins / 60)} ч ${mins % 60} мин`;
}

function StatCard({ label, value, sub, accent }: { label: string; value: string | number; sub?: string; accent?: 'green' | 'orange' | 'red' }) {
  return (
    <div className={`hs-stat${accent ? ` hs-stat--${accent}` : ''}`}>
      <span className="hs-stat__val">{value}</span>
      <span className="hs-stat__label">{label}</span>
      {sub && <span className="hs-stat__sub">{sub}</span>}
    </div>
  );
}

export const HistoryPage = () => {
  const { state } = useWriteOffs();

  const all = state.status === 'done' ? state.data : [];
  const approved = all.filter((w) => w.status === 'approved');
  const rejected = all.filter((w) => w.status === 'rejected');
  const pending = all.filter((w) => w.status === 'pending');

  const approvalRate = all.length > 0 ? Math.round(((approved.length) / (approved.length + rejected.length || 1)) * 100) : 0;

  const byOutlet = all.reduce<Record<string, number>>((acc, w) => {
    acc[w.outletName] = (acc[w.outletName] ?? 0) + 1;
    return acc;
  }, {});

  const topOutlet = Object.entries(byOutlet).sort((a, b) => b[1] - a[1])[0];

  return (
    <main className="page-shell">
      <div className="hs-header">
        <h1 className="hs-title">История списаний</h1>
        <p className="hs-sub">Все заявки по всем точкам</p>
      </div>

      <div className="hs-stats-row">
        <StatCard label="Всего заявок" value={all.length} />
        <StatCard label="Одобрено" value={approved.length} accent="green" sub={`${approvalRate}% от завершённых`} />
        <StatCard label="Отклонено" value={rejected.length} accent="red" />
        <StatCard label="На проверке" value={pending.length} accent="orange" />
        {topOutlet && <StatCard label="Лидер по списаниям" value={topOutlet[0]} sub={`${topOutlet[1]} заявок`} />}
      </div>

      {state.status === 'loading' && <div className="wo-state">Загрузка…</div>}
      {state.status === 'error' && <div className="wo-state wo-state--error">{state.message}</div>}
      {state.status === 'done' && (
        <ul className="wo-list">
          {all.map((wo) => {
            const rt = reviewTime(wo);
            return (
              <li key={wo.id} className="hs-card">
                <div className="hs-card__left">
                  <div className="hs-card__top">
                    <span className="hs-card__product">{wo.productName}</span>
                    <span className="hs-card__qty">{wo.quantity} {wo.unit}</span>
                  </div>
                  <div className="hs-card__meta">
                    <span>{wo.employeeName}</span>
                    <span className="wo-dot">·</span>
                    <span>{wo.outletName}</span>
                    <span className="wo-dot">·</span>
                    <span>{REASON_LABELS[wo.reasonCode] ?? wo.reasonCode}</span>
                  </div>
                  <div className="hs-card__time">
                    {formatDate(wo.createdAt)}
                    {wo.reviewerName && <span className="hs-card__reviewer"> · Проверил: {wo.reviewerName}</span>}
                    {rt && <span className="hs-card__rt"> · Время реакции: {rt}</span>}
                  </div>
                  {wo.comment && <p className="rv-card__comment">"{wo.comment}"</p>}
                  {wo.rejectionReason && <p className="rv-card__rejection">Причина отказа: {wo.rejectionReason}</p>}
                </div>
                <span className={`wo-badge wo-badge--${wo.status}`}>{STATUS_LABELS[wo.status]}</span>
              </li>
            );
          })}
        </ul>
      )}
    </main>
  );
};
