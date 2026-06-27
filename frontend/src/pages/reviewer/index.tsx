import { useState } from 'react';
import type { WriteOff, WriteOffStatus } from 'entities/write-off';
import { REASON_LABELS, STATUS_LABELS } from 'entities/write-off';
import { useWriteOffs } from 'features/write-offs/use-write-offs';
import './styles.css';

function formatElapsed(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins} мин назад`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} ч назад`;
  return `${Math.floor(hrs / 24)} дн назад`;
}

function pendingMinutes(iso: string): number {
  return Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
}

function PendingSLA({ createdAt }: { createdAt: string }) {
  const mins = pendingMinutes(createdAt);
  const hrs = Math.floor(mins / 60);
  const rem = mins % 60;
  const label = hrs > 0 ? `${hrs}ч ${rem}мин` : `${mins}мин`;
  const urgent = mins >= 240;
  const warn = mins >= 60;
  return (
    <span className={`rv-sla${urgent ? ' rv-sla--urgent' : warn ? ' rv-sla--warn' : ''}`}>
      {urgent ? '🔴' : warn ? '🟡' : '🟢'} Ожидает {label}
    </span>
  );
}

type AIWarning = {
  flag: boolean;
  reason?: string;
};

function mockAIWarning(wo: WriteOff): AIWarning {
  if (wo.id === 'wo-1') return { flag: true, reason: 'Фото не соответствует заявленному продукту. Обнаружены признаки повторного использования изображения.' };
  if (wo.id === 'wo-3') return { flag: true, reason: 'Временная метка фото не совпадает со временем подачи заявки (расхождение 14 часов).' };
  return { flag: false };
}

function ReviewCard({ wo, onReview }: { wo: WriteOff; onReview: (id: string, d: { status: 'approved' | 'rejected'; rejectionReason?: string }) => Promise<void> }) {
  const [busy, setBusy] = useState(false);
  const [rejecting, setRejecting] = useState(false);
  const [reason, setReason] = useState('');
  const ai = mockAIWarning(wo);

  const approve = async () => {
    setBusy(true);
    await onReview(wo.id, { status: 'approved' });
    setBusy(false);
  };

  const reject = async () => {
    if (!reason.trim()) return;
    setBusy(true);
    await onReview(wo.id, { status: 'rejected', rejectionReason: reason });
    setBusy(false);
    setRejecting(false);
  };

  return (
    <li className={`rv-card${ai.flag ? ' rv-card--flagged' : ''}`}>
      {ai.flag && (
        <div className="rv-ai-warning">
          <span className="rv-ai-warning__icon">⚠️</span>
          <div>
            <strong>ИИ-предупреждение</strong>
            <p>{ai.reason}</p>
          </div>
        </div>
      )}

      <div className="rv-card__top">
        <div className="rv-card__identity">
          <span className="rv-card__product">{wo.productName}</span>
          <span className="rv-card__qty">{wo.quantity} {wo.unit}</span>
        </div>
        <span className={`wo-badge wo-badge--${wo.status}`}>{STATUS_LABELS[wo.status]}</span>
      </div>

      <div className="rv-card__details">
        <span className="rv-detail-chip">{wo.employeeName}</span>
        <span className="rv-detail-chip">{wo.outletName}</span>
        <span className="rv-detail-chip">{REASON_LABELS[wo.reasonCode] ?? wo.reasonCode}</span>
        <span className="rv-detail-time">{formatElapsed(wo.createdAt)}</span>
      </div>

      {wo.status === 'pending' && <PendingSLA createdAt={wo.createdAt} />}

      {wo.comment && <p className="rv-card__comment">"{wo.comment}"</p>}

      {wo.photoUrl && (
        <div className="rv-photo-wrap">
          <img src={wo.photoUrl} alt="Фото списания" className="rv-photo" />
        </div>
      )}

      {wo.status === 'rejected' && wo.rejectionReason && (
        <p className="rv-card__rejection">Отклонено: {wo.rejectionReason}</p>
      )}

      {wo.status === 'pending' && (
        <div className="rv-card__actions">
          {rejecting ? (
            <>
              <input
                className="wo-reject-input"
                placeholder="Укажите причину отказа…"
                value={reason}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setReason(e.target.value)}
                autoFocus
              />
              <button className="wo-btn wo-btn--reject" onClick={reject} disabled={busy || !reason.trim()}>
                Отклонить
              </button>
              <button className="wo-btn wo-btn--ghost" onClick={() => setRejecting(false)} disabled={busy}>
                Отмена
              </button>
            </>
          ) : (
            <>
              <button className="wo-btn wo-btn--approve" onClick={approve} disabled={busy}>
                Одобрить
              </button>
              <button className="wo-btn wo-btn--reject" onClick={() => setRejecting(true)} disabled={busy}>
                Отклонить
              </button>
            </>
          )}
        </div>
      )}
    </li>
  );
}

export const ReviewerPage = () => {
  const [filter, setFilter] = useState<WriteOffStatus | 'pending'>('pending');
  const { state, review } = useWriteOffs({ status: filter === 'pending' ? 'pending' : undefined });

  const pending = state.status === 'done' ? state.data.filter((w) => w.status === 'pending') : [];
  const flagged = state.status === 'done' ? state.data.filter((w) => mockAIWarning(w).flag && w.status === 'pending') : [];

  return (
    <main className="page-shell">
      <div className="rv-header">
        <div>
          <h1 className="rv-title">Очередь проверки</h1>
          <p className="rv-sub">Заявки на списание, требующие решения</p>
        </div>
        <div className="rv-stats">
          {pending.length > 0 && (
            <div className="rv-stat rv-stat--orange">
              <span className="rv-stat__val">{pending.length}</span>
              <span className="rv-stat__label">На проверке</span>
            </div>
          )}
          {flagged.length > 0 && (
            <div className="rv-stat rv-stat--red">
              <span className="rv-stat__val">{flagged.length}</span>
              <span className="rv-stat__label">Флаг ИИ</span>
            </div>
          )}
        </div>
      </div>

      <div className="wo-filters" style={{ marginBottom: 16 }}>
        {(['pending', undefined] as const).map((s) => (
          <button
            key={s ?? 'all'}
            className={`wo-filter-btn${filter === (s ?? 'all') ? ' active' : ''}`}
            onClick={() => setFilter(s ?? ('all' as never))}
          >
            {s === 'pending' ? 'На проверке' : 'Все заявки'}
          </button>
        ))}
      </div>

      {state.status === 'loading' && <div className="wo-state">Загрузка…</div>}
      {state.status === 'error' && <div className="wo-state wo-state--error">{state.message}</div>}
      {state.status === 'done' && state.data.length === 0 && (
        <div className="wo-state">Нет заявок для проверки</div>
      )}
      {state.status === 'done' && state.data.length > 0 && (
        <ul className="wo-list">
          {state.data.map((wo) => (
            <ReviewCard key={wo.id} wo={wo} onReview={review} />
          ))}
        </ul>
      )}
    </main>
  );
};
