import { useState } from 'react';
import {
  AlertTriangle,
  Camera,
  CheckCircle2,
  Clock,
  Copy,
  Folder,
  Loader2,
  Plus,
  Send,
} from 'lucide-react';

import { useDashboard, useAsyncData } from 'shared/qamqor-context/DashboardContext';
import { useInvestigations } from 'shared/qamqor-context/InvestigationsContext';
import {
  INVESTIGATION_STATUS_LABELS,
  type Anomaly,
  type Investigation,
  type InvestigationStatus,
} from 'shared/qamqor-data/types';
import { fmtMoney, fmtDateTime } from 'shared/qamqor-data/format';
import { C } from 'shared/qamqor-data/colors';

/* ─────────────────────────── props ─────────────────────────── */

interface Props {
  onOpenLocation: (locationId: string) => void;
  onOpenEmployee: (employeeId: string) => void;
}

/* ─────────────────────────── status helpers ─────────────────────────── */

const STATUS_BADGE: Record<InvestigationStatus, string> = {
  open: 'badge-red',
  in_progress: 'badge-amber',
  closed: 'badge-green',
};

const STATUS_ICON: Record<InvestigationStatus, typeof Clock> = {
  open: Clock,
  in_progress: Loader2,
  closed: CheckCircle2,
};

const ADVANCE_LABEL: Record<InvestigationStatus, string> = {
  open: 'Взять в работу',
  in_progress: 'Закрыть',
  closed: '',
};

const NEXT_STATUS: Record<InvestigationStatus, InvestigationStatus | null> = {
  open: 'in_progress',
  in_progress: 'closed',
  closed: null,
};

/* ─────────────────────────── InvestigationCard ─────────────────────────── */

interface InvestigationCardProps {
  inv: Investigation;
  onOpenLocation: (locationId: string) => void;
}

function InvestigationCard({ inv, onOpenLocation }: InvestigationCardProps) {
  const { setStatus, addNote } = useInvestigations();
  const [expanded, setExpanded] = useState(false);
  const [draft, setDraft] = useState('');

  const StatusIcon = STATUS_ICON[inv.status];
  const next = NEXT_STATUS[inv.status];

  function submitNote() {
    const trimmed = draft.trim();
    if (trimmed) {
      addNote(inv.id, trimmed);
      setDraft('');
    }
  }

  return (
    <div className="rounded-2xl border border-stone-100 bg-white overflow-hidden shadow-sm">
      {/* Header row */}
      <button
        onClick={() => setExpanded((v) => !v)}
        className="w-full flex items-start gap-3 p-4 text-left hover:bg-stone-50 transition-colors"
      >
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-bold text-text-primary">
              {inv.locationName.replace('Bahandi ', '')}
            </span>
            <span className={`badge ${STATUS_BADGE[inv.status]} flex items-center gap-1`}>
              <StatusIcon className="w-3 h-3" />
              {INVESTIGATION_STATUS_LABELS[inv.status]}
            </span>
          </div>
          <p className="text-xs text-text-muted mt-0.5 truncate">{inv.reason}</p>
        </div>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onOpenLocation(inv.locationId);
          }}
          className="btn-secondary text-xs px-3 py-1.5 flex-shrink-0"
        >
          Открыть точку
        </button>
      </button>

      {/* Expanded body */}
      {expanded && (
        <div className="px-4 pb-4 pt-1 border-t border-stone-100 space-y-3">
          {/* Details grid */}
          <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
            <span className="text-text-muted">Ответственный</span>
            <span className="font-medium text-text-primary text-right">
              {inv.assignee.split(' — ')[0]}
            </span>
            <span className="text-text-muted">Недостача</span>
            <span className="font-bold text-right" style={{ color: C.red }}>
              {fmtMoney(inv.deficitAtOpen)}
            </span>
            <span className="text-text-muted">Открыто</span>
            <span className="font-medium text-text-primary text-right">
              {fmtDateTime(inv.openedAt)}
            </span>
          </div>

          {/* Notes */}
          {inv.notes.length > 0 && (
            <div className="space-y-1.5">
              {inv.notes.map((n) => (
                <div key={n.id} className="bg-offwhite rounded-xl px-3 py-2 text-xs">
                  <p className="text-text-primary">{n.text}</p>
                  <p className="text-text-faint mt-0.5">
                    {n.author.split(' — ')[0]} · {fmtDateTime(n.createdAt)}
                  </p>
                </div>
              ))}
            </div>
          )}

          {/* Add note */}
          <div className="flex gap-1.5">
            <input
              className="text-input text-xs py-2 flex-1"
              placeholder="Добавить заметку…"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') submitNote();
              }}
            />
            <button onClick={submitNote} className="btn-secondary px-3 py-2">
              <Send className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Status actions */}
          <div className="flex gap-1.5">
            {next && (
              <button
                onClick={() => setStatus(inv.id, next)}
                className="btn-primary flex-1 py-2 text-xs"
              >
                {ADVANCE_LABEL[inv.status]}
              </button>
            )}
            {inv.status !== 'open' && (
              <button
                onClick={() => setStatus(inv.id, 'open')}
                className="btn-secondary py-2 text-xs px-3"
              >
                Вернуть в «Открыто»
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/* ─────────────────────────── AnomalyRow ─────────────────────────── */

interface AnomalyRowProps {
  anomaly: Anomaly;
  onOpenLocation: (locationId: string) => void;
}

function AnomalyRow({ anomaly, onOpenLocation }: AnomalyRowProps) {
  const isTheft = anomaly.type === 'theft';

  return (
    <div
      onClick={() => onOpenLocation(anomaly.locationId)}
      className="flex items-start gap-3 px-3 py-2.5 rounded-xl cursor-pointer transition-opacity hover:opacity-80"
      style={{
        background: isTheft ? '#FDE8E8' : '#E8F5E9',
        borderLeft: `3px solid ${isTheft ? C.red : C.green}`,
      }}
    >
      {isTheft ? (
        <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: C.red }} />
      ) : (
        <CheckCircle2 className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: C.green }} />
      )}
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <span className="text-xs font-semibold text-text-primary truncate">
            {anomaly.locationName.replace('Bahandi ', '')}
          </span>
          <span className="text-xs text-text-muted flex-shrink-0">
            {anomaly.date} {anomaly.time}
          </span>
        </div>
        <p className="text-xs text-text-primary mt-0.5 leading-relaxed">{anomaly.text}</p>
      </div>
    </div>
  );
}

/* ─────────────────────────── PhotoDuplicatesCard ─────────────────────────── */

interface PhotoDuplicatesCardProps {
  onOpenEmployee: (employeeId: string) => void;
}

function PhotoDuplicatesCard({ onOpenEmployee }: PhotoDuplicatesCardProps) {
  return (
    <div className="card p-5">
      <div className="flex items-center gap-2 mb-4">
        <Copy className="w-4 h-4 flex-shrink-0" style={{ color: C.red }} />
        <h3 className="text-sm font-bold text-text-primary">Дубликаты фото</h3>
      </div>

      {/* Evidence block */}
      <div className="bg-theft-light rounded-xl p-3 mb-3">
        <div className="flex items-center gap-3">
          {/* Overlapping photo squares */}
          <div className="flex flex-shrink-0 -space-x-3">
            <div
              className="w-12 h-12 rounded-xl flex items-center justify-center border-2 border-white"
              style={{ background: '#FECACA' }}
            >
              <Camera className="w-5 h-5" style={{ color: C.red }} />
            </div>
            <div
              className="w-12 h-12 rounded-xl flex items-center justify-center border-2 border-white"
              style={{ background: '#FCA5A5' }}
            >
              <Camera className="w-5 h-5" style={{ color: C.red }} />
            </div>
          </div>

          {/* Labels */}
          <div className="min-w-0">
            <p className="text-xs font-bold text-text-primary">Идентичный снимок</p>
            <p className="text-xs text-text-muted mt-0.5">req-001 и req-002</p>
            <p className="text-xs text-text-muted">Асан Е. · Сарыарка</p>
          </div>
        </div>
      </div>

      <button
        onClick={() => onOpenEmployee('emp-asan')}
        className="btn-secondary w-full text-xs py-2 mb-3"
      >
        Открыть досье Асана
      </button>

      <p className="text-xs text-text-muted leading-relaxed">
        Одно фото в двух заявках с разницей 33 минуты — признак фиктивного списания.
      </p>
    </div>
  );
}

/* ─────────────────────────── InvestigationsView (default export) ─────────────────────────── */

export default function InvestigationsView({ onOpenLocation, onOpenEmployee }: Props) {
  const { source, period } = useDashboard();
  const { investigations } = useInvestigations();
  const { data: anomalies } = useAsyncData(
    () => source.getAnomalies(period),
    [source, period],
  );

  const openCount = investigations.filter((i) => i.status !== 'closed').length;
  const theftCount = (anomalies ?? []).filter((a) => a.type === 'theft').length;

  return (
    <div className="space-y-5">
      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-black text-text-primary">Расследования</h2>
          <p className="text-sm text-text-muted mt-0.5">
            Сигналы системы и активные дела по подозрительным точкам
          </p>
        </div>

        {/* Counter tiles */}
        <div className="flex gap-3 flex-wrap">
          <div className="card px-4 py-2.5 flex flex-col items-center min-w-[72px]">
            <span className="text-lg font-black text-text-primary">{investigations.length}</span>
            <span className="text-xs text-text-muted leading-tight text-center">Всего дел</span>
          </div>
          <div className="card px-4 py-2.5 flex flex-col items-center min-w-[72px]">
            <span
              className="text-lg font-black"
              style={{ color: openCount > 0 ? C.red : C.green }}
            >
              {openCount}
            </span>
            <span className="text-xs text-text-muted leading-tight text-center">Открытых</span>
          </div>
          <div className="card px-4 py-2.5 flex flex-col items-center min-w-[72px]">
            <span
              className="text-lg font-black"
              style={{ color: theftCount > 0 ? C.red : C.green }}
            >
              {theftCount}
            </span>
            <span className="text-xs text-text-muted leading-tight text-center">Сигналов</span>
          </div>
        </div>
      </div>

      {/* ── Active investigations ── */}
      <div className="card p-5">
        <div className="flex items-center gap-2 mb-1">
          <Folder className="w-4 h-4" style={{ color: C.amberDark }} />
          <h3 className="text-sm font-bold text-text-primary">Активные расследования</h3>
          {investigations.length > 0 && (
            <span className="badge badge-ink ml-auto">{investigations.length}</span>
          )}
        </div>
        <p className="text-xs text-text-muted mb-4">Открываются по подозрительным точкам</p>

        {investigations.length === 0 ? (
          <div className="flex flex-col items-center text-center py-8 px-4">
            <div className="w-12 h-12 rounded-full bg-offwhite flex items-center justify-center mb-3">
              <Plus className="w-6 h-6 text-text-faint" />
            </div>
            <p className="text-sm font-semibold text-text-primary">Пока нет расследований</p>
            <p className="text-xs text-text-muted mt-1.5 leading-relaxed max-w-xs">
              Откройте расследование по красной точке — кнопка в карточке точки и в её деталях.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {investigations.map((inv) => (
              <InvestigationCard
                key={inv.id}
                inv={inv}
                onOpenLocation={onOpenLocation}
              />
            ))}
          </div>
        )}
      </div>

      {/* ── Bottom two-column grid ── */}
      <div className="grid lg:grid-cols-2 gap-5">
        {/* Anomaly feed */}
        <div className="card p-5">
          <div className="flex items-center gap-2 mb-4">
            <AlertTriangle className="w-4 h-4 flex-shrink-0" style={{ color: C.red }} />
            <h3 className="text-sm font-bold text-text-primary">Лента аномалий</h3>
            {theftCount > 0 && (
              <span className="badge badge-red ml-auto">{theftCount} сигналов</span>
            )}
          </div>

          {anomalies === null ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-5 h-5 animate-spin text-text-muted" />
            </div>
          ) : anomalies.length === 0 ? (
            <div className="flex flex-col items-center text-center py-8">
              <CheckCircle2 className="w-8 h-8 mb-2" style={{ color: C.green }} />
              <p className="text-sm font-medium text-text-primary">Аномалий нет</p>
              <p className="text-xs text-text-muted mt-1">Сеть работает в штатном режиме</p>
            </div>
          ) : (
            <div className="space-y-2">
              {anomalies.map((a) => (
                <AnomalyRow key={a.id} anomaly={a} onOpenLocation={onOpenLocation} />
              ))}
            </div>
          )}
        </div>

        {/* Photo duplicates */}
        <PhotoDuplicatesCard onOpenEmployee={onOpenEmployee} />
      </div>
    </div>
  );
}
