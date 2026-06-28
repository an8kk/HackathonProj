import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  CheckCircle2, XCircle, AlertTriangle, Clock, Camera,
  ChevronDown, ChevronUp, ArrowLeft, Package, Copy, Utensils,
} from 'lucide-react';
import { useAuth } from 'shared/auth/session';
import { apiClient, ApiError } from 'shared/api/client';
import IntegrationStatus from 'widgets/integration-status';
import type { WriteOffRequest } from 'shared/qamqor-data/types';
import type { EmployeeDto, OutletDto, ProductDto, ReasonCode, WriteOffDto } from 'shared/api/types';

const REASON_LABELS: Record<ReasonCode, string> = {
  DAMAGED: 'Брак',
  EXPIRED: 'Истёк срок годности',
  OVERCOOKED: 'Пережарено/испорчено',
  RAW_WASTE: 'Обрезка/отход',
  DROPPED: 'Упал/разбился',
  OTHER: 'Другое',
};

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
  'exceeds-norm': { label: 'Превышение нормы', color: '#DC3545', bg: 'rgba(220,53,69,0.08)' },
  'duplicate-photo': { label: 'Дубликат фото', color: '#DC3545', bg: 'rgba(220,53,69,0.08)' },
  'anomaly-employee': { label: 'Аномалия по сотруднику', color: '#EA5E1F', bg: 'rgba(234,94,31,0.08)' },
  'supplier-anomaly': { label: 'Брак поставщика > нормы', color: '#EA5E1F', bg: 'rgba(234,94,31,0.08)' },
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
    'photo-dup-A': '#FEF3C7',
    'photo-003': '#D1FAE5',
    'photo-004': '#EDE9FE',
    'photo-005': '#FCE7F3',
    'photo-006': '#E0F2FE',
  };
  return (
    <div className="relative flex-shrink-0">
      <div
        className="w-[72px] h-[72px] rounded-xl flex items-center justify-center"
        style={{ background: colors[photoId] ?? '#F3F3F3' }}
      >
        <Camera className="w-6 h-6" style={{ color: '#999' }} />
      </div>
      {isDuplicate && (
        <div
          className="absolute -top-1 -right-1 flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[10px] font-bold"
          style={{ background: '#DC3545', color: '#fff' }}
        >
          <Copy className="w-2.5 h-2.5" /> DUP
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
  const isDeduction = req.writeOffType === 'with_deduction';

  function handleReject() {
    if (!rejReason) return;
    onReject(req.id, rejReason);
    setRejecting(false);
  }

  return (
    <div
      className="card overflow-hidden"
      style={isFlagged ? { borderLeftColor: '#DC3545', borderLeftWidth: 3 } : {}}
    >
      <div className="p-4">
        <div className="flex gap-3">
          <PhotoBlock photoId={req.photoId} isDuplicate={isDuplicate} />
          <div className="flex-1 min-w-0">
            {isFlagged && (
              <div className="flex flex-wrap gap-1 mb-2">
                {req.flags.map(f => {
                  const info = FLAG_LABELS[f];
                  if (!info) return null;
                  return (
                    <span key={f} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold" style={{ background: info.bg, color: info.color }}>
                      <AlertTriangle className="w-3 h-3" />{info.label}
                    </span>
                  );
                })}
              </div>
            )}

            <div className="flex items-start justify-between gap-2 mb-1.5">
              <p className="font-bold text-charcoal text-[15px] leading-snug">{req.productName}</p>
              {req.status === 'pending' ? (
                <span className="badge badge-orange flex-shrink-0"><Clock className="w-3 h-3" />На проверке</span>
              ) : req.status === 'approved' ? (
                <span className="badge badge-green flex-shrink-0"><CheckCircle2 className="w-3 h-3" />Одобрено</span>
              ) : (
                <span className="badge badge-red flex-shrink-0"><XCircle className="w-3 h-3" />Отклонено</span>
              )}
            </div>

            <p className="text-[13px] text-muted">{req.quantity} {req.productType === 'unit' ? 'шт' : 'г'} · {req.reasonLabel}</p>

            <div className="flex flex-wrap items-center gap-x-2 gap-y-1 mt-2">
              <span
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold"
                style={{
                  background: isDeduction ? 'rgba(220,53,69,0.08)' : 'rgba(25,135,84,0.08)',
                  color: isDeduction ? '#DC3545' : '#198754',
                }}
              >
                <Package className="w-3 h-3" />
                {isDeduction ? 'С удержанием' : 'Без удержания'}
              </span>
              <span className="text-[12px] text-muted">{req.employeeName}</span>
              <span className="text-[12px] text-muted">·</span>
              <span className="text-[12px] text-muted">{req.locationName.replace('Bahandi ', '')}</span>
              <span className="text-[12px] text-muted">·</span>
              <span className="text-[12px] text-muted">{formatDate(req.timestamp)}</span>
            </div>
          </div>
        </div>

        <button
          onClick={() => setExpanded(e => !e)}
          className="mt-3 flex items-center gap-1 text-[12px] text-muted hover:text-charcoal transition-colors"
        >
          {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          {expanded ? 'Свернуть' : 'Подробнее'}
        </button>

        {expanded && (
          <div className="mt-3 pt-3" style={{ borderTop: '1px solid #F3F3F3' }}>
            <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-[12px] mb-3">
              <span className="text-muted">ID заявки</span>
              <span className="font-mono text-charcoal">{req.id}</span>
              <span className="text-muted">ID фото</span>
              <span className="font-mono text-charcoal">{req.photoId}</span>
            </div>
            {req.comment && (
              <p className="text-[12px] text-charcoal bg-surface rounded-lg px-3 py-2 italic mb-2">
                «{req.comment}»
              </p>
            )}
            <div className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-surface text-[12px] text-muted">
              <Camera className="w-3 h-3 flex-shrink-0" />
              фото · {formatDate(req.timestamp)} · {req.locationName.replace('Bahandi ', '')}
            </div>
          </div>
        )}

        {req.status === 'pending' && !rejecting && (
          <div className="flex gap-2 mt-3 pt-3" style={{ borderTop: '1px solid #F3F3F3' }}>
            <button onClick={() => onApprove(req.id)} disabled={busy} className="btn btn-success flex-1 text-[13px] py-2.5">
              <CheckCircle2 className="w-4 h-4" />Одобрить
            </button>
            <button onClick={() => setRejecting(true)} disabled={busy} className="btn btn-danger flex-1 text-[13px] py-2.5">
              <XCircle className="w-4 h-4" />Отклонить
            </button>
          </div>
        )}

        {rejecting && (
          <div className="mt-3 pt-3" style={{ borderTop: '1px solid #F3F3F3' }}>
            <p className="section-label mb-2">Причина отклонения</p>
            <select
              className="input text-[14px] mb-2"
              value={rejReason}
              onChange={e => setRejReason(e.target.value)}
            >
              <option value="">— выберите —</option>
              {REJECTION_REASONS.map(r => <option key={r} value={r}>{r}</option>)}
            </select>
            <div className="flex gap-2">
              <button onClick={handleReject} disabled={!rejReason || busy} className="btn btn-danger flex-1 py-2.5 text-[13px]">
                Подтвердить отклонение
              </button>
              <button onClick={() => setRejecting(false)} className="btn btn-secondary text-[13px] py-2.5 px-4">
                Отмена
              </button>
            </div>
          </div>
        )}

        {req.status === 'rejected' && req.rejectionReason && (
          <div className="mt-3 pt-3 text-[12px] rounded-lg px-3 py-2" style={{ borderTop: '1px solid #F3F3F3', background: 'rgba(220,53,69,0.06)', color: '#DC3545' }}>
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
      .catch(err => { if (active) setError(err instanceof ApiError ? err.code : 'network_error'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  const handleReview = useCallback(
    async (id: string, decision: 'approved' | 'rejected', rejectionReason?: string) => {
      const reviewerId = user?.id;
      if (!reviewerId) { setError('Сессия не найдена — войдите как проверяющий'); return; }
      setBusyId(id);
      try {
        await apiClient.reviewWriteOff(id, { reviewer_id: reviewerId, decision, rejection_reason: rejectionReason });
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
  const withDeduction = uiRequests.filter(r => r.writeOffType === 'with_deduction').length;
  const sorted = [...uiRequests].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  const filtered = sorted.filter(r => filter === 'flagged' ? r.writeOffType === 'with_deduction' : true);

  return (
    <div className="min-h-screen bg-surface">
      {/* Top bar */}
      <div className="topbar">
        <button onClick={() => navigate('/')} className="btn btn-ghost p-1.5 -ml-1">
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div className="flex items-center gap-2 flex-1">
          <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: '#198754' }}>
            <Utensils className="w-4 h-4 text-white" strokeWidth={2} />
          </div>
          <span className="font-bold text-charcoal text-[15px]">Кабинет проверяющего</span>
        </div>
        <span className="text-[13px] text-muted">{user?.name ?? ''}</span>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-6">
        {/* Stats */}
        <div className="card p-5 mb-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="font-bold text-charcoal text-lg">Очередь проверки</p>
              <p className="text-[13px] text-muted mt-0.5">Bahandi · все точки</p>
            </div>
            <div className="avatar w-10 h-10 text-[15px]">
              {(user?.name ?? 'М').split(' ').map(n => n[0]).join('').slice(0, 2)}
            </div>
          </div>
          <div className="flex gap-6">
            {[
              { label: 'На проверке', value: uiRequests.length, color: '#EA5E1F' },
              { label: 'С удержанием', value: withDeduction, color: '#DC3545' },
              { label: 'Без удержания', value: uiRequests.length - withDeduction, color: '#198754' },
            ].map(s => (
              <div key={s.label}>
                <div className="text-2xl font-bold" style={{ color: s.color }}>{s.value}</div>
                <div className="text-[12px] text-muted mt-0.5">{s.label}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="mb-5">
          <IntegrationStatus />
        </div>

        {error && (
          <div className="mb-4 px-4 py-3 rounded-xl text-[13px] font-medium rounded-lg" style={{ background: 'rgba(220,53,69,0.08)', color: '#DC3545' }}>
            Ошибка: {error}
          </div>
        )}

        {/* Filter tabs */}
        <div className="flex gap-2 mb-5">
          {([
            { id: 'all', label: 'Все заявки' },
            { id: 'pending', label: 'На проверке' },
            { id: 'flagged', label: 'С удержанием' },
          ] as const).map(f => (
            <button
              key={f.id}
              onClick={() => setFilter(f.id)}
              className={`px-4 py-2 rounded-[10px] text-[13px] font-semibold transition-colors ${
                filter === f.id ? 'bg-charcoal text-white' : 'bg-offwhite text-muted hover:bg-surface-hover'
              }`}
            >
              {f.label}
              {f.id === 'flagged' && withDeduction > 0 && (
                <span className="ml-1.5 inline-flex items-center justify-center w-5 h-5 rounded-full text-[10px] font-bold bg-red text-white">
                  {withDeduction}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* List */}
        {loading ? (
          <div className="text-center py-20 text-muted text-[14px]">Загрузка заявок…</div>
        ) : filtered.length === 0 ? (
          <div className="card p-12 text-center">
            <CheckCircle2 className="w-10 h-10 mx-auto mb-3" style={{ color: '#198754', opacity: 0.4 }} />
            <p className="font-semibold text-charcoal mb-1">Нет заявок</p>
            <p className="text-[13px] text-muted">В этой категории пусто</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
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
