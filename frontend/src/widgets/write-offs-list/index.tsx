import React, { useState } from 'react';
import type { WriteOff, WriteOffStatus } from 'entities/write-off';
import { REASON_LABELS, STATUS_LABELS } from 'entities/write-off';
import { useWriteOffs } from 'features/write-offs/use-write-offs';
import './styles.css';

export const WriteOffsList = () => {
  const [filter, setFilter] = useState<WriteOffStatus | undefined>(undefined);
  const { state, review } = useWriteOffs({ status: filter });

  return (
    <section className="wo-section">
      <div className="wo-header">
        <h2 className="wo-title">Заявки на списание</h2>
        <div className="wo-filters">
          {([undefined, 'pending', 'approved', 'rejected'] as const).map((s) => (
            <button
              key={s ?? 'all'}
              className={`wo-filter-btn${filter === s ? ' active' : ''}`}
              onClick={() => setFilter(s)}
            >
              {s ? STATUS_LABELS[s] : 'Все'}
            </button>
          ))}
        </div>
      </div>

      {state.status === 'loading' && (
        <div className="wo-state">Загрузка…</div>
      )}

      {state.status === 'error' && (
        <div className="wo-state wo-state--error">{state.message}</div>
      )}

      {state.status === 'done' && state.data.length === 0 && (
        <div className="wo-state">Заявок нет</div>
      )}

      {state.status === 'done' && state.data.length > 0 && (
        <ul className="wo-list">
          {state.data.map((wo) => (
            <WriteOffCard key={wo.id} writeOff={wo} onReview={review} />
          ))}
        </ul>
      )}
    </section>
  );
};

type WriteOffCardProps = {
  writeOff: WriteOff;
  onReview: (id: string, decision: { status: 'approved' | 'rejected'; rejectionReason?: string }) => Promise<void>;
};

const WriteOffCard = ({ writeOff: wo, onReview }: WriteOffCardProps) => {
  const [busy, setBusy] = useState(false);
  const [rejecting, setRejecting] = useState(false);
  const [reason, setReason] = useState('');

  const handle = async (status: 'approved' | 'rejected') => {
    setBusy(true);
    try {
      await onReview(wo.id, { status, rejectionReason: status === 'rejected' ? reason : undefined });
    } finally {
      setBusy(false);
      setRejecting(false);
      setReason('');
    }
  };

  const elapsed = formatElapsed(wo.createdAt);

  return (
    <li className="wo-card">
      <div className="wo-card__top">
        <div className="wo-card__meta">
          <span className="wo-card__product">{wo.productName}</span>
          <span className="wo-card__qty">
            {wo.quantity} {wo.unit}
          </span>
        </div>
        <span className={`wo-badge wo-badge--${wo.status}`}>{STATUS_LABELS[wo.status]}</span>
      </div>

      <div className="wo-card__details">
        <span>{wo.employeeName}</span>
        <span className="wo-dot">·</span>
        <span>{wo.outletName}</span>
        <span className="wo-dot">·</span>
        <span>{REASON_LABELS[wo.reasonCode] ?? wo.reasonCode}</span>
        <span className="wo-dot">·</span>
        <span className="wo-card__time">{elapsed}</span>
      </div>

      {wo.comment && <p className="wo-card__comment">"{wo.comment}"</p>}

      {wo.status === 'rejected' && wo.rejectionReason && (
        <p className="wo-card__rejection">Отклонено: {wo.rejectionReason}</p>
      )}

      {wo.status === 'pending' && (
        <div className="wo-card__actions">
          {rejecting ? (
            <>
              <input
                className="wo-reject-input"
                placeholder="Причина отказа…"
                value={reason}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setReason(e.target.value)}
                autoFocus
              />
              <button
                className="wo-btn wo-btn--reject"
                disabled={busy || !reason.trim()}
                onClick={() => handle('rejected')}
              >
                {busy ? '…' : 'Отклонить'}
              </button>
              <button className="wo-btn wo-btn--ghost" onClick={() => setRejecting(false)}>
                Отмена
              </button>
            </>
          ) : (
            <>
              <button
                className="wo-btn wo-btn--approve"
                disabled={busy}
                onClick={() => handle('approved')}
              >
                {busy ? '…' : 'Одобрить'}
              </button>
              <button
                className="wo-btn wo-btn--ghost"
                disabled={busy}
                onClick={() => setRejecting(true)}
              >
                Отклонить
              </button>
            </>
          )}
        </div>
      )}
    </li>
  );
};

function formatElapsed(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 60) return `${mins} мин назад`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} ч назад`;
  return `${Math.floor(hrs / 24)} дн назад`;
}
