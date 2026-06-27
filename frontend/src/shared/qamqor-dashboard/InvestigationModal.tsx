import { useState } from 'react';
import { X, ShieldAlert } from 'lucide-react';
import { useInvestigations } from 'shared/qamqor-context/InvestigationsContext';
import { fmtMoneyFull } from 'shared/qamqor-data/format';
import type { LocationStats } from 'shared/qamqor-data/types';

const ASSIGNEES = [
  'Марат К. — служба безопасности',
  'Аружан Т. — внутренний аудит',
  'Динара О. — финансовый контроль',
  'Ербол С. — региональный управляющий',
];

const REASON_PRESETS = [
  'Превышение AvT variance > 3%',
  'Аномальная недостача по инвентаризации',
  'Ночной всплеск списаний',
  'Дубликат фото в заявках',
  'Аномальный сотрудник по браку',
];

export default function InvestigationModal({
  location,
  onClose,
}: {
  location: LocationStats;
  onClose: () => void;
}) {
  const { openInvestigation } = useInvestigations();
  const [assignee, setAssignee] = useState(ASSIGNEES[0]);
  const [reason, setReason] = useState(REASON_PRESETS[0]);
  const [note, setNote] = useState('');

  function submit() {
    openInvestigation({
      locationId: location.locationId,
      locationName: location.locationName,
      assignee,
      reason,
      deficitAtOpen: location.unexplainedDeficit,
      note: note.trim() || undefined,
    });
    onClose();
  }

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center p-4"
      style={{ background: 'rgba(20,18,16,0.55)', backdropFilter: 'blur(2px)' }}
      onClick={onClose}
    >
      <div
        className="card w-full max-w-md p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between mb-1">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-theft-light flex items-center justify-center flex-shrink-0">
              <ShieldAlert className="w-5 h-5 text-theft" />
            </div>
            <div>
              <h3 className="font-black text-text-primary text-lg leading-tight">Открыть расследование</h3>
              <p className="text-xs text-text-muted">{location.locationName}</p>
            </div>
          </div>
          <button onClick={onClose} className="text-text-muted hover:text-text-primary">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="mt-3 mb-4 p-3 rounded-xl bg-theft-light flex items-center justify-between">
          <span className="text-xs text-theft font-medium">Необъяснённая недостача на момент открытия</span>
          <span className="text-sm font-black text-theft">{fmtMoneyFull(location.unexplainedDeficit)}</span>
        </div>

        <label className="block text-xs font-semibold text-text-muted mb-1.5">Ответственный</label>
        <select className="select-input mb-3" value={assignee} onChange={(e) => setAssignee(e.target.value)}>
          {ASSIGNEES.map((a) => <option key={a} value={a}>{a}</option>)}
        </select>

        <label className="block text-xs font-semibold text-text-muted mb-1.5">Основание</label>
        <select className="select-input mb-3" value={reason} onChange={(e) => setReason(e.target.value)}>
          {REASON_PRESETS.map((r) => <option key={r} value={r}>{r}</option>)}
        </select>

        <label className="block text-xs font-semibold text-text-muted mb-1.5">Заметка (необязательно)</label>
        <textarea
          className="text-input mb-4"
          rows={3}
          placeholder="Например: проверить смену 24–26.06, запросить записи с камер за 22:00–23:00…"
          value={note}
          onChange={(e) => setNote(e.target.value)}
        />

        <div className="flex gap-2">
          <button onClick={submit} className="btn-primary flex-1 py-3">
            <ShieldAlert className="w-4 h-4" />
            Открыть расследование
          </button>
          <button onClick={onClose} className="btn-secondary px-5">Отмена</button>
        </div>
      </div>
    </div>
  );
}
