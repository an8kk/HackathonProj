import { useState } from 'react';
import { Folder, Clock, CheckCircle2, Loader2, ChevronRight, Plus, Send } from 'lucide-react';
import { useInvestigations } from 'shared/qamqor-context/InvestigationsContext';
import { INVESTIGATION_STATUS_LABELS } from 'shared/qamqor-data/types';
import type { Investigation, InvestigationStatus } from 'shared/qamqor-data/types';
import { fmtMoney, fmtDateTime } from 'shared/qamqor-data/format';

const STATUS_STYLE: Record<InvestigationStatus, { badge: string; icon: typeof Clock }> = {
  open: { badge: 'badge-red', icon: Clock },
  in_progress: { badge: 'badge-amber', icon: Loader2 },
  closed: { badge: 'badge-green', icon: CheckCircle2 },
};

const NEXT_STATUS: Record<InvestigationStatus, InvestigationStatus | null> = {
  open: 'in_progress',
  in_progress: 'closed',
  closed: null,
};

const ADVANCE_LABEL: Record<InvestigationStatus, string> = {
  open: 'Взять в работу',
  in_progress: 'Закрыть',
  closed: '',
};

function InvestigationItem({ inv }: { inv: Investigation }) {
  const { setStatus, addNote } = useInvestigations();
  const [expanded, setExpanded] = useState(false);
  const [draft, setDraft] = useState('');
  const style = STATUS_STYLE[inv.status];
  const StatusIcon = style.icon;
  const next = NEXT_STATUS[inv.status];

  return (
    <div className="rounded-xl border border-stone-100 overflow-hidden">
      <button
        onClick={() => setExpanded((e) => !e)}
        className="w-full flex items-center gap-2.5 p-3 text-left hover:bg-stone-50 transition-colors"
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold text-text-primary truncate">
              {inv.locationName.replace('Bahandi ', '')}
            </span>
            <span className={`badge ${style.badge}`}>
              <StatusIcon className="w-3 h-3" />
              {INVESTIGATION_STATUS_LABELS[inv.status]}
            </span>
          </div>
          <div className="text-xs text-text-muted mt-0.5 truncate">{inv.reason}</div>
        </div>
        <ChevronRight className={`w-4 h-4 text-text-muted flex-shrink-0 transition-transform ${expanded ? 'rotate-90' : ''}`} />
      </button>

      {expanded && (
        <div className="px-3 pb-3 pt-1 border-t border-stone-100">
          <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs mb-2">
            <span className="text-text-muted">Ответственный</span>
            <span className="font-medium text-text-primary text-right">{inv.assignee.split(' — ')[0]}</span>
            <span className="text-text-muted">Недостача</span>
            <span className="font-bold text-theft text-right">{fmtMoney(inv.deficitAtOpen)}</span>
            <span className="text-text-muted">Открыто</span>
            <span className="font-medium text-text-primary text-right">{fmtDateTime(inv.openedAt)}</span>
          </div>

          {/* Notes */}
          {inv.notes.length > 0 && (
            <div className="flex flex-col gap-1.5 mb-2">
              {inv.notes.map((n) => (
                <div key={n.id} className="text-xs bg-offwhite rounded-lg px-2.5 py-1.5">
                  <span className="text-text-primary">{n.text}</span>
                  <span className="text-text-faint block mt-0.5">{n.author.split(' — ')[0]} · {fmtDateTime(n.createdAt)}</span>
                </div>
              ))}
            </div>
          )}

          {/* Add note */}
          <div className="flex gap-1.5 mb-2">
            <input
              className="text-input text-xs py-2 flex-1"
              placeholder="Добавить заметку…"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && draft.trim()) { addNote(inv.id, draft.trim()); setDraft(''); }
              }}
            />
            <button
              onClick={() => { if (draft.trim()) { addNote(inv.id, draft.trim()); setDraft(''); } }}
              className="btn-secondary px-3 py-2"
            >
              <Send className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Status actions */}
          <div className="flex gap-1.5">
            {next && (
              <button onClick={() => setStatus(inv.id, next)} className="btn-primary flex-1 py-2 text-xs">
                {ADVANCE_LABEL[inv.status]}
              </button>
            )}
            {inv.status !== 'open' && (
              <button onClick={() => setStatus(inv.id, 'open')} className="btn-secondary py-2 text-xs px-3">
                Вернуть в «Открыто»
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default function InvestigationsPanel() {
  const { investigations } = useInvestigations();

  return (
    <div className="card p-5">
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-2">
          <Folder className="w-4 h-4 text-amber-dark" />
          <h3 className="text-sm font-bold text-text-primary">Расследования</h3>
        </div>
        {investigations.length > 0 && (
          <span className="badge badge-ink">{investigations.length}</span>
        )}
      </div>
      <p className="text-xs text-text-muted mb-4">Открываются по подозрительным точкам</p>

      {investigations.length === 0 ? (
        <div className="flex flex-col items-center text-center py-6 px-2">
          <div className="w-11 h-11 rounded-full bg-offwhite flex items-center justify-center mb-2.5">
            <Plus className="w-5 h-5 text-text-faint" />
          </div>
          <p className="text-sm font-medium text-text-primary">Пока нет расследований</p>
          <p className="text-xs text-text-muted mt-1 leading-relaxed">
            Откройте расследование по красной точке — кнопка появляется в карточке точки и в её деталях.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {investigations.map((inv) => <InvestigationItem key={inv.id} inv={inv} />)}
        </div>
      )}
    </div>
  );
}
