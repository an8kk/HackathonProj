import { useState } from 'react';
import {
  X, MapPin, AlertTriangle, User, Camera, ShieldAlert, Clock,
  Loader2, TrendingDown, Package, Layers, Tag, ChevronRight,
} from 'lucide-react';
import { useDashboard, useAsyncData } from 'shared/qamqor-context/DashboardContext';
import { useApp } from 'shared/qamqor-context/AppContext';
import { useInvestigations } from 'shared/qamqor-context/InvestigationsContext';
import { fmtMoney, fmtMoneyFull, fmtDateTime } from 'shared/qamqor-data/format';
import { statusColor, varianceColor, C } from 'shared/qamqor-data/colors';
import { INVESTIGATION_STATUS_LABELS } from 'shared/qamqor-data/types';
import HourlyChart from './charts/HourlyChart';
import InvestigationModal from './InvestigationModal';

export default function LocationDetailDrawer({
  locationId,
  onClose,
  onOpenEmployee,
}: {
  locationId: string;
  onClose: () => void;
  onOpenEmployee?: (id: string) => void;
}) {
  const { source, period } = useDashboard();
  const { requests } = useApp();
  const { byLocation, setStatus } = useInvestigations();
  const [modalOpen, setModalOpen] = useState(false);

  const { data: detail, loading } = useAsyncData(
    () => source.getLocationDetail(period, locationId),
    [source, period, locationId],
  );

  const locRequests = requests.filter((r) => r.locationId === locationId);
  const investigation = byLocation(locationId);

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* Backdrop */}
      <div
        className="absolute inset-0"
        style={{ background: 'rgba(20,18,16,0.45)' }}
        onClick={onClose}
      />

      {/* Panel */}
      <div
        className="relative w-full max-w-2xl bg-offwhite h-full overflow-y-auto shadow-2xl"
        style={{ animation: 'drawerIn 0.25s ease' }}
      >
        {loading || !detail ? (
          <div className="flex items-center justify-center h-full text-text-muted gap-2">
            <Loader2 className="w-5 h-5 animate-spin" />
            Загрузка деталей точки…
          </div>
        ) : (
          <>
            {/* Header */}
            <div className="bg-ink text-white px-6 py-5 sticky top-0 z-10">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <span
                    className="w-3 h-3 rounded-full flex-shrink-0"
                    style={{
                      background: statusColor(detail.stats.status),
                      boxShadow: detail.stats.status === 'red' ? `0 0 0 4px ${C.red}40` : undefined,
                    }}
                  />
                  <div>
                    <h2 className="text-xl font-black">{detail.stats.locationName}</h2>
                    <div className="flex items-center gap-1.5 text-text-muted text-xs mt-0.5">
                      <MapPin className="w-3 h-3" />
                      {detail.stats.district}
                    </div>
                  </div>
                </div>
                <button onClick={onClose} className="text-white/60 hover:text-white">
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="flex items-end gap-6 mt-4">
                <div>
                  <div className="text-3xl font-black" style={{ color: varianceColor(detail.stats.variancePercent) }}>
                    {detail.stats.variancePercent}%
                  </div>
                  <div className="text-xs text-text-muted">AvT variance</div>
                </div>
                <div>
                  <div className="text-3xl font-black text-white">{fmtMoney(detail.stats.unexplainedDeficit)}</div>
                  <div className="text-xs text-text-muted">необъяснённая недостача</div>
                </div>
                {detail.stats.status === 'red' && (
                  <span className="badge badge-red mb-1.5">
                    <AlertTriangle className="w-3 h-3" />
                    Хищение
                  </span>
                )}
              </div>
            </div>

            <div className="px-6 py-5 flex flex-col gap-5">
              {/* Investigation status / action */}
              {investigation ? (
                <div className="card p-4" style={{ borderLeft: `4px solid ${C.amber}` }}>
                  <div className="flex items-center gap-3">
                    <ShieldAlert className="w-5 h-5 text-amber-dark flex-shrink-0" />
                    <div className="flex-1">
                      <p className="text-sm font-bold text-text-primary">
                        Расследование · {INVESTIGATION_STATUS_LABELS[investigation.status]}
                      </p>
                      <p className="text-xs text-text-muted">
                        {investigation.assignee.split(' — ')[0]} · {investigation.reason}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2 mt-3">
                    {investigation.status === 'open' && (
                      <button onClick={() => setStatus(investigation.id, 'in_progress')} className="btn-primary flex-1 py-2 text-xs">
                        Взять в работу
                      </button>
                    )}
                    {investigation.status === 'in_progress' && (
                      <button onClick={() => setStatus(investigation.id, 'closed')} className="btn-primary flex-1 py-2 text-xs">
                        Закрыть расследование
                      </button>
                    )}
                    {investigation.status !== 'open' && (
                      <button onClick={() => setStatus(investigation.id, 'open')} className="btn-secondary py-2 text-xs px-3">
                        Вернуть в «Открыто»
                      </button>
                    )}
                  </div>
                </div>
              ) : detail.stats.status !== 'green' && (
                <button onClick={() => setModalOpen(true)} className="btn-primary w-full py-3.5">
                  <ShieldAlert className="w-4 h-4" />
                  Открыть расследование по точке
                </button>
              )}

              {/* Money breakdown */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {[
                  { label: 'Теор. норма', value: fmtMoney(detail.stats.theoreticalLoss), tone: 'ink' },
                  { label: 'Задекларировано', value: fmtMoney(detail.stats.declaredWriteOffs), tone: 'amber' },
                  { label: 'Факт. недостача', value: fmtMoney(detail.stats.actualDeficit), tone: 'amber' },
                  { label: 'Необъяснённое', value: fmtMoney(detail.stats.unexplainedDeficit), tone: 'red' },
                ].map((m) => (
                  <div key={m.label} className="card p-3.5 text-center" style={{ background: m.tone === 'red' ? '#FDE8E8' : '#fff' }}>
                    <div
                      className="text-lg font-black"
                      style={{ color: m.tone === 'red' ? C.red : m.tone === 'amber' ? C.amberDark : C.ink }}
                    >
                      {m.value}
                    </div>
                    <div className="text-xs text-text-muted mt-0.5">{m.label}</div>
                  </div>
                ))}
              </div>

              {/* Flags */}
              {detail.flags.length > 0 && (
                <div className="card p-4">
                  <p className="text-xs font-bold text-text-muted uppercase tracking-wider mb-2">Флаги по заявкам</p>
                  <div className="flex flex-wrap gap-1.5">
                    {detail.flags.map((f) => (
                      <span key={f} className="badge badge-red">
                        <AlertTriangle className="w-3 h-3" />{f}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Hourly chart */}
              <div className="card p-5">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-bold text-text-primary">Списания по часам</h3>
                  {detail.stats.status === 'red' && (
                    <span className="badge badge-red"><Clock className="w-3 h-3" />Ночной всплеск</span>
                  )}
                </div>
                <HourlyChart data={detail.hourly} valueLabel={detail.stats.locationName.replace('Bahandi ', '')} />
              </div>

              {/* Shifts */}
              <div className="card p-5">
                <h3 className="text-sm font-bold text-text-primary mb-3">Списания по сменам</h3>
                <div className="flex flex-col gap-3">
                  {detail.shifts.map((s) => {
                    const isEvening = s.shift.startsWith('Вечер');
                    const heavy = isEvening && detail.stats.status === 'red';
                    return (
                      <div key={s.shift}>
                        <div className="flex items-center justify-between text-sm mb-1">
                          <span className="text-text-primary">{s.shift}</span>
                          <span className={`font-bold ${heavy ? 'text-theft' : 'text-text-primary'}`}>
                            {fmtMoney(s.amount)} · {s.share}%
                          </span>
                        </div>
                        <div className="h-2 bg-stone-100 rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full"
                            style={{ width: `${s.share}%`, background: heavy ? C.red : C.green }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Employees */}
              {detail.employees.length === 0 ? (
                <div className="card p-5">
                  <h3 className="text-sm font-bold text-text-primary mb-1">Сотрудники точки</h3>
                  <p className="text-sm text-text-muted">Аномалий по сотрудникам не обнаружено — показатели в пределах нормы.</p>
                </div>
              ) : (
                <div className="card p-5">
                  <h3 className="text-sm font-bold text-text-primary mb-3">Сотрудники точки</h3>
                  <div className="flex flex-col gap-2.5">
                    {detail.employees.map((emp) => {
                      const hot = emp.medianMultiplier > 2;
                      return (
                        <button
                          key={emp.employeeId}
                          onClick={() => { if (onOpenEmployee) { onClose(); onOpenEmployee(emp.employeeId); } }}
                          disabled={!onOpenEmployee}
                          className="flex items-center gap-3 text-left rounded-xl -mx-1 px-1 py-1 transition-colors enabled:hover:bg-stone-50"
                        >
                          <div
                            className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0"
                            style={{ background: hot ? '#FDE8E8' : '#F6F3EE' }}
                          >
                            <User className="w-4 h-4" style={{ color: hot ? C.red : C.muted }} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-bold text-text-primary">{emp.employeeName}</span>
                              {hot && <span className="badge badge-red">×{emp.medianMultiplier} от медианы</span>}
                            </div>
                            <div className="text-xs text-text-muted">{emp.writeOffCount} заявок · {fmtMoney(emp.totalWriteOffs)}</div>
                          </div>
                          <div className="w-20 h-2 bg-stone-100 rounded-full overflow-hidden flex-shrink-0">
                            <div
                              className="h-full rounded-full"
                              style={{ width: `${Math.min(emp.medianMultiplier / 5 * 100, 100)}%`, background: hot ? C.red : C.green }}
                            />
                          </div>
                          {onOpenEmployee && <ChevronRight className="w-4 h-4 text-text-muted flex-shrink-0" />}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Stage breakdown */}
              <div className="card p-5">
                <div className="flex items-center gap-2 mb-3">
                  <Layers className="w-4 h-4 text-text-muted" />
                  <h3 className="text-sm font-bold text-text-primary">Потери по этапу цикла</h3>
                  {detail.stats.status === 'red' && (
                    <span className="badge badge-red ml-auto">
                      <AlertTriangle className="w-3 h-3" />Выдача &gt;50%
                    </span>
                  )}
                </div>
                <div className="flex flex-col gap-2.5">
                  {detail.stages.map((s) => {
                    const isAnomaly = s.stageCode === 'serving' && detail.stats.status === 'red';
                    return (
                      <div key={s.stageCode}>
                        <div className="flex items-center justify-between text-xs mb-1">
                          <span className="font-medium text-text-primary">{s.stageLabel}</span>
                          <div className="flex items-center gap-2 text-text-muted">
                            <span className="text-[10px]">сеть {s.networkShare}%</span>
                            <span className={`font-bold ${isAnomaly ? 'text-theft' : 'text-text-primary'}`}>
                              {s.share}%
                            </span>
                          </div>
                        </div>
                        <div className="relative h-2 bg-stone-100 rounded-full overflow-hidden">
                          <div
                            className="absolute left-0 top-0 h-full rounded-full opacity-30"
                            style={{ width: `${s.networkShare}%`, background: '#8C8780' }}
                          />
                          <div
                            className="absolute left-0 top-0 h-full rounded-full"
                            style={{
                              width: `${s.share}%`,
                              background: isAnomaly ? '#D62828' : s.share > s.networkShare + 10 ? '#C47F00' : '#2E7D32',
                            }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
                {detail.stats.status === 'red' && (
                  <p className="text-xs text-theft bg-theft-light rounded-lg px-3 py-2 mt-3 leading-relaxed">
                    65% потерь на «Выдаче» — классическая схема: товар отдаётся без кассы, потом списывается как брак.
                  </p>
                )}
              </div>

              {/* Reason categories */}
              <div className="card p-5">
                <div className="flex items-center gap-2 mb-3">
                  <Tag className="w-4 h-4 text-text-muted" />
                  <h3 className="text-sm font-bold text-text-primary">Причины списаний</h3>
                  <span className="text-[10px] text-text-muted ml-1">vs средняя по сети</span>
                </div>
                <div className="flex flex-col gap-3">
                  {detail.reasonCategories.map((rc) => {
                    const isHighExternal = rc.category === 'external' && rc.share > rc.networkShare * 2;
                    const dot = rc.category === 'external' ? '#C47F00' : rc.category === 'employee' ? '#D62828' : '#2E7D32';
                    return (
                      <div key={rc.category}>
                        <div className="flex items-center justify-between text-xs mb-1">
                          <div className="flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full" style={{ background: dot }} />
                            <span className="font-medium text-text-primary">{rc.label}</span>
                            {isHighExternal && (
                              <span className="badge badge-amber text-[9px] px-1 py-0">×{(rc.share / rc.networkShare).toFixed(1)} выше сети</span>
                            )}
                          </div>
                          <div className="flex items-center gap-2 text-text-muted">
                            <span className="text-[10px]">сеть {rc.networkShare}%</span>
                            <span className="font-bold text-text-primary">{rc.share}%</span>
                          </div>
                        </div>
                        <div className="relative h-1.5 bg-stone-100 rounded-full overflow-hidden">
                          <div
                            className="absolute left-0 top-0 h-full rounded-full opacity-30"
                            style={{ width: `${rc.networkShare}%`, background: '#8C8780' }}
                          />
                          <div
                            className="absolute left-0 top-0 h-full rounded-full"
                            style={{ width: `${rc.share}%`, background: dot }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
                {detail.reasonCategories.find(r => r.category === 'external' && r.share > r.networkShare * 2) && (
                  <p className="text-xs text-amber-700 bg-amber-50 rounded-lg px-3 py-2 mt-3 leading-relaxed">
                    Доля «брак поставщика» в {(detail.reasonCategories.find(r=>r.category==='external')!.share / detail.reasonCategories.find(r=>r.category==='external')!.networkShare).toFixed(1)}× выше среднего по сети при том же поставщике — признак фиктивных заявок.
                  </p>
                )}
              </div>

              {/* Requests feed with photo evidence */}
              <div className="card p-5">
                <div className="flex items-center gap-2 mb-3">
                  <Package className="w-4 h-4 text-text-muted" />
                  <h3 className="text-sm font-bold text-text-primary">Заявки точки</h3>
                  <span className="badge badge-ink">{locRequests.length}</span>
                </div>
                {locRequests.length === 0 ? (
                  <p className="text-sm text-text-muted py-2">Заявок за период нет</p>
                ) : (
                  <div className="flex flex-col gap-2">
                    {locRequests.slice(0, 8).map((req) => {
                      const flagged = req.flags.length > 0;
                      return (
                        <div
                          key={req.id}
                          className="flex items-center gap-3 p-2.5 rounded-xl"
                          style={{ background: flagged ? '#FDE8E8' : '#F6F3EE' }}
                        >
                          <div className="w-10 h-10 rounded-lg bg-white flex items-center justify-center flex-shrink-0">
                            <Camera className="w-4 h-4 text-text-muted" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-semibold text-text-primary truncate">{req.productName}</span>
                              {flagged && <AlertTriangle className="w-3.5 h-3.5 text-theft flex-shrink-0" />}
                            </div>
                            <div className="text-xs text-text-muted truncate">
                              {req.quantity} {req.productType === 'unit' ? 'шт' : 'г'} · {req.reasonLabel} · {req.employeeName}
                            </div>
                          </div>
                          <div className="text-xs text-text-muted flex-shrink-0">{fmtDateTime(req.timestamp)}</div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Footer hint */}
              <div className="flex items-center gap-2 text-xs text-text-muted pb-2">
                <TrendingDown className="w-3.5 h-3.5" />
                Данные за период: {fmtMoneyFull(detail.stats.unexplainedDeficit)} необъяснённой недостачи
              </div>
            </div>
          </>
        )}
      </div>

      {modalOpen && detail && (
        <InvestigationModal location={detail.stats} onClose={() => setModalOpen(false)} />
      )}
    </div>
  );
}
