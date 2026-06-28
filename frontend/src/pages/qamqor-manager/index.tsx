import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  CheckCircle2, XCircle, AlertTriangle, Clock, Camera,
  ChevronDown, ChevronUp, ArrowLeft, Shield,
  Copy, Package,
} from 'lucide-react';
import { useAuth } from 'shared/auth/session';
import { apiClient, ApiError } from 'shared/api/client';
import IntegrationStatus from 'widgets/integration-status';
import type { WriteOffRequest } from 'shared/qamqor-data/types';
import type {
  EmployeeDto, OutletDto, ProductDto, ReasonCode, WriteOffDto,
} from 'shared/api/types';
const REASON_LABELS: Record<ReasonCode, string> = {
  DAMAGED: 'Брак',
  EXPIRED: 'Истёк срок годности',
  OVERCOOKED: 'Пережарено/испорчено',
  RAW_WASTE: 'Обрезка/отход',
  DROPPED: 'Упал/разбился',
  OTHER: 'Другое',
};
// Backend write-off + reference data → the UI shape RequestCard already renders.
function toUiRequest(
  dto: WriteOffDto,
  products: Map<string, ProductDto>,
  employees: Map<string, EmployeeDto>,
  outlets: Map<string, OutletDto>,
): WriteOffRequest {
  const product = products.get(dto.product_id);
  return {
    id: dto.id,
    employeeId: dto.employee_id,
    employeeName: employees.get(dto.employee_id)?.name ?? dto.employee_id,
    locationId: dto.outlet_id,
    locationName: outlets.get(dto.outlet_id)?.name ?? dto.outlet_id,
    productId: dto.product_id,
    productName: product?.name ?? dto.product_id,
    productType: product?.unit === 'штуки' ? 'unit' : 'weight',
    quantity: dto.quantity,
    wastePercent: undefined,
    reasonCode: dto.reason_code,
    reasonLabel: REASON_LABELS[dto.reason_code] ?? dto.reason_code,
    stageCode: '',
    stageLabel: `${dto.quantity} ${dto.unit}`,
    comment: dto.comment,
    photoId: dto.photo_id ?? '',
    shift: dto.created_at,
    timestamp: dto.created_at,
    status: dto.status,
    writeOffType: dto.deduction_type === 'WITH_DEDUCTION' ? 'with_deduction' : 'no_deduction',
    aiSuggestedType: true,
    flags: [],
    rejectionReason: dto.rejection_reason ?? undefined,
  };
}

const FLAG_LABELS: Record<string, { label: string; color: string; bg: string }> = {
  'exceeds-norm': { label: 'Превышение нормы отхода', color: '#D62828', bg: '#FDE8E8' },
  'duplicate-photo': { label: 'Дубликат фото', color: '#D62828', bg: '#FDE8E8' },
  'anomaly-employee': { label: 'Аномалия по сотруднику', color: '#C47F00', bg: '#FFF3CC' },
  'supplier-anomaly': { label: 'Брак поставщика > нормы по сети', color: '#C47F00', bg: '#FFF3CC' },
};

const REJECTION_REASONS = [
  'Нет обоснования превышения нормы',
  'Дубликат заявки',
  'Нет фото или фото не соответствует',
  'Неверная причина списания',
  'Требуется повторная проверка',
];

function formatDate(ts: string) {
  const d = new Date(ts);
  return d.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: '2-digit' }) +
    ' ' + d.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
}

function PhotoBlock({ photoId, isDuplicate }: { photoId: string; isDuplicate: boolean }) {
  const colors: Record<string, string> = {
    'photo-dup-A': '#FEF9C3',
    'photo-003': '#DCFCE7',
    'photo-004': '#EDE9FE',
    'photo-005': '#FCE7F3',
    'photo-006': '#E0F2FE',
  };
  const bg = colors[photoId] || '#F6F3EE';
  return (
    <div className="relative">
      <div
        className="w-20 h-20 rounded-xl flex items-center justify-center flex-shrink-0"
        style={{ background: bg }}
      >
        <Camera className="w-7 h-7 text-text-muted" />
      </div>
      {isDuplicate && (
        <div
          className="absolute -top-1.5 -right-1.5 flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[10px] font-bold"
          style={{ background: '#D62828', color: '#fff' }}
        >
          <Copy className="w-2.5 h-2.5" />
          DUP
        </div>
      )}
    </div>
  );
}

interface RequestCardProps {
  req: WriteOffRequest;
  busy: boolean;
  onApprove: (id: string) => void;
  onReject: (id: string, reason: string) => void;
}
function RequestCard({ req, busy, onApprove, onReject }: RequestCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [rejecting, setRejecting] = useState(false);
  const [rejReason, setRejReason] = useState('');
  const isFlagged = req.flags.length > 0;
  const isDuplicate = req.flags.includes('duplicate-photo');
  function handleReject() {
    if (!rejReason) return;
    onReject(req.id, rejReason);
    setRejecting(false);
  }

  return (
    <div
      className="card overflow-hidden"
      style={{ borderLeft: isFlagged ? '4px solid #D62828' : '4px solid transparent' }}
    >
      <div className="p-4">
        <div className="flex gap-3">
          <PhotoBlock photoId={req.photoId} isDuplicate={isDuplicate} />

          <div className="flex-1 min-w-0">
            {isFlagged && (
              <div className="flex flex-wrap gap-1.5 mb-2">
                {req.flags.map(f => {
                  const info = FLAG_LABELS[f];
                  if (!info) return null;
                  return (
                    <span
                      key={f}
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold"
                      style={{ background: info.bg, color: info.color }}
                    >
                      <AlertTriangle className="w-3 h-3" />
                      {info.label}
                    </span>
                  );
                })}
              </div>
            )}

            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="font-bold text-text-primary text-sm">{req.productName}</p>
                <p className="text-xs text-text-muted mt-0.5">
                  {req.quantity} {req.productType === 'unit' ? 'шт' : 'г'} · {req.reasonLabel}
                </p>
              </div>
              {req.status === 'pending' ? (
                <span className="badge badge-amber flex-shrink-0">
                  <Clock className="w-3 h-3" />На проверке
                </span>
              ) : req.status === 'approved' ? (
                <span className="badge badge-green flex-shrink-0">
                  <CheckCircle2 className="w-3 h-3" />Одобрено
                </span>
              ) : (
                <span className="badge badge-red flex-shrink-0">
                  <XCircle className="w-3 h-3" />Отклонено
                </span>
              )}
            </div>

            <div className="flex flex-wrap gap-2 mt-2">
              <span className="badge badge-ink">
                <Package className="w-3 h-3" />
                {req.stageLabel}
              </span>
              <span
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold"
                style={{
                  background: req.writeOffType === 'with_deduction' ? '#FDE8E8' : '#E8F5E9',
                  color: req.writeOffType === 'with_deduction' ? '#D62828' : '#2E7D32',
                }}
              >
                {req.writeOffType === 'with_deduction' ? 'С удержанием' : 'Без удержания'}
                {!req.aiSuggestedType && ' · ручной выбор'}
              </span>
              <span className="text-xs text-text-muted">{req.employeeName}</span>
              <span className="text-xs text-text-muted">·</span>
              <span className="text-xs text-text-muted">{req.locationName.replace('Bahandi ', '')}</span>
              <span className="text-xs text-text-muted">·</span>
              <span className="text-xs text-text-muted">{formatDate(req.timestamp)}</span>
            </div>

            {req.productType === 'weight' && req.wastePercent !== undefined && (
              <div className="mt-2 flex items-center gap-2">
                <div className="flex-1 h-1.5 bg-stone-100 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{
                      width: `${Math.min(req.wastePercent / 30 * 100, 100)}%`,
                      background: req.flags.includes('exceeds-norm') ? '#D62828' : '#2E7D32',
                    }}
                  />
                </div>
                <span className={`text-xs font-bold ${req.flags.includes('exceeds-norm') ? 'text-theft' : 'text-success'}`}>
                  {req.wastePercent.toFixed(1)}%
                </span>
              </div>
            )}
          </div>
        </div>

        <button
          onClick={() => setExpanded(e => !e)}
          className="mt-3 flex items-center gap-1 text-xs text-text-muted hover:text-text-primary transition-colors"
        >
          {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          {expanded ? 'Свернуть' : 'Подробнее'}
        </button>

        {expanded && (
          <div className="mt-3 pt-3 border-t border-stone-100">
            <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs mb-3">
              <div className="text-text-muted">Смена</div>
              <div className="font-medium text-text-primary">{req.shift}</div>
              <div className="text-text-muted">ID заявки</div>
              <div className="font-mono text-text-primary">{req.id}</div>
              <div className="text-text-muted">ID фото</div>
              <div className="font-mono text-text-primary">{req.photoId}</div>
            </div>
            {req.comment && (
              <div className="text-xs text-text-muted mb-1">Комментарий сотрудника:</div>
            )}
            {req.comment && (
              <p className="text-xs text-text-primary bg-offwhite rounded-lg px-3 py-2 italic">
                «{req.comment}»
              </p>
            )}

            {req.overrideExplanation && (
              <div className="mt-2 p-2.5 rounded-lg text-xs" style={{ background: '#FFF3CC', color: '#C47F00' }}>
                <span className="font-semibold">Пояснение к типу удержания:</span> {req.overrideExplanation}
              </div>
            )}

            <div className="mt-3 flex items-center gap-2 px-3 py-2 rounded-lg bg-stone-50 text-xs text-text-muted">
              <Camera className="w-3 h-3 flex-shrink-0" />
              фото сделано в приложении · {formatDate(req.timestamp)} · {req.locationName.replace('Bahandi ', '')}
            </div>
          </div>
        )}

        {req.status === 'pending' && !rejecting && (
          <div className="flex gap-2 mt-3 pt-3 border-t border-stone-100">
            <button onClick={() => onApprove(req.id)} disabled={busy} className="btn-success flex-1 text-sm py-2.5 disabled:opacity-40">
              <CheckCircle2 className="w-4 h-4" />
              Одобрить
            </button>
            <button onClick={() => setRejecting(true)} disabled={busy} className="btn-danger flex-1 text-sm py-2.5 disabled:opacity-40">
              <XCircle className="w-4 h-4" />
              Отклонить
            </button>
          </div>
        )}

        {rejecting && (
          <div className="mt-3 pt-3 border-t border-stone-100">
            <p className="text-xs font-semibold text-text-muted mb-2">Причина отклонения:</p>
            <select
              className="select-input text-sm mb-2"
              value={rejReason}
              onChange={e => setRejReason(e.target.value)}
            >
              <option value="">— выберите —</option>
              {REJECTION_REASONS.map(r => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
            <div className="flex gap-2">
              <button onClick={handleReject} disabled={!rejReason || busy} className="btn-danger flex-1 text-sm py-2.5 disabled:opacity-40">
                Подтвердить отклонение
              </button>
              <button onClick={() => setRejecting(false)} className="btn-secondary text-sm py-2.5 px-4">
                Отмена
              </button>
            </div>
          </div>
        )}

        {req.status === 'rejected' && req.rejectionReason && (
          <div className="mt-3 pt-3 border-t border-stone-100 text-xs text-theft bg-theft-light rounded-lg px-3 py-2">
            Отклонено: {req.rejectionReason}
          </div>
        )}
      </div>
    </div>
  );
}

export default function QamqorManager() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [writeOffs, setWriteOffs] = useState<WriteOffDto[]>([]);
  const [products, setProducts] = useState<Map<string, ProductDto>>(new Map());
  const [employees, setEmployees] = useState<Map<string, EmployeeDto>>(new Map());
  const [outlets, setOutlets] = useState<Map<string, OutletDto>>(new Map());
  const [filter, setFilter] = useState<'all' | 'pending' | 'flagged'>('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);
  const loadQueue = useCallback(async () => {
    setWriteOffs(await apiClient.listWriteOffs({ status: 'pending' }));
  }, []);
  useEffect(() => {
    let active = true;
    setLoading(true);
    Promise.all([
      apiClient.listProducts(),
      apiClient.listEmployees(),
      apiClient.listOutlets(),
      apiClient.listWriteOffs({ status: 'pending' }),
    ])
      .then(([prods, emps, outs, queue]) => {
        if (!active) return;
        setProducts(new Map(prods.map(p => [p.id, p])));
        setEmployees(new Map(emps.map(e => [e.id, e])));
        setOutlets(new Map(outs.map(o => [o.id, o])));
        setWriteOffs(queue);
        setError('');
      })
      .catch(err => {
        if (active) setError(err instanceof ApiError ? err.code : 'network_error');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, []);
  const handleReview = useCallback(
    async (id: string, decision: 'approved' | 'rejected', rejectionReason?: string) => {
      const reviewerId = user?.id;
      if (!reviewerId) {
        setError('Сессия не найдена — войдите как проверяющий');
        return;
      }
      setBusyId(id);
      try {
        await apiClient.reviewWriteOff(id, {
          reviewer_id: reviewerId,
          decision,
          rejection_reason: rejectionReason,
        });
        await loadQueue();
        setError('');
      } catch (err) {
        setError(err instanceof ApiError ? err.code : 'network_error');
      } finally {
        setBusyId(null);
      }
    },
    [user, loadQueue],
  );
  const uiRequests = useMemo(
    () => writeOffs.map(dto => toUiRequest(dto, products, employees, outlets)),
    [writeOffs, products, employees, outlets],
  );
  const flaggedCount = uiRequests.filter(r => r.writeOffType === 'with_deduction').length;
  const noDeductionCount = uiRequests.length - flaggedCount;
  const sorted = [...uiRequests].sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
  );
  const filtered = sorted.filter(r =>
    filter === 'flagged' ? r.writeOffType === 'with_deduction' : true,
  );
  return (
    <div className="min-h-screen bg-offwhite">
      <div className="bg-ink text-white">
        <div className="max-w-5xl mx-auto px-6 py-4">
          <div className="flex items-center gap-4 mb-4">
            <button onClick={() => navigate('/')} className="flex items-center gap-1.5 text-white/50 hover:text-white transition-colors text-sm">
              <ArrowLeft className="w-4 h-4" />
              На главную
            </button>
            <div className="flex items-center gap-2">
              <Shield className="w-5 h-5 text-amber-DEFAULT" />
              <span className="font-bold text-sm text-white/80">Qamqor</span>
            </div>
          </div>
          <h1 className="text-2xl font-black">Кабинет проверяющего</h1>
          <p className="text-text-muted text-sm mt-0.5">Bahandi · все точки · Алматы</p>
          <div className="flex gap-6 mt-5">
            {[
              { label: 'Новых', value: uiRequests.length, color: '#F5A300' },
              { label: 'С удержанием', value: flaggedCount, color: '#D62828' },
              { label: 'Без удержания', value: noDeductionCount, color: '#2E7D32' },
            ].map(s => (
              <div key={s.label}>
                <div className="text-3xl font-black" style={{ color: s.color }}>{s.value}</div>
                <div className="text-xs text-text-muted mt-0.5">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
      <div className="max-w-5xl mx-auto px-6 py-6">
        <div className="mb-5">
          <IntegrationStatus />
        </div>
        {error && (
          <div className="mb-5 px-4 py-3 rounded-xl text-sm font-medium text-theft bg-theft-light">
            Ошибка: {error}
          </div>
        )}
        <div className="flex gap-2 mb-5">
          {([
            { id: 'all', label: 'Все заявки' },
            { id: 'pending', label: 'На проверке' },
            { id: 'flagged', label: 'С удержанием' },
          ] as const).map(f => (
            <button
              key={f.id}
              onClick={() => setFilter(f.id)}
              className={`px-4 py-2 rounded-xl text-sm font-semibold transition-colors ${
                filter === f.id
                  ? 'bg-ink text-white'
                  : 'bg-white text-text-muted hover:bg-stone-50'
              }`}
            >
              {f.label}
              {f.id === 'flagged' && flaggedCount > 0 && (
                <span className="ml-1.5 inline-flex items-center justify-center w-5 h-5 rounded-full text-[11px] font-black bg-theft text-white">
                  {flaggedCount}
                </span>
              )}
            </button>
          ))}
        </div>
        {loading ? (
          <div className="text-center py-20 text-text-muted">Загрузка заявок…</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20 text-text-muted">Нет заявок в этой категории</div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {filtered.map(req => (
              <RequestCard
                key={req.id}
                req={req}
                busy={busyId === req.id}
                onApprove={id => handleReview(id, 'approved')}
                onReject={(id, reason) => handleReview(id, 'rejected', reason)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
