import {
  X, User, AlertTriangle, MapPin, Camera, TrendingDown, Loader2,
  Package, Clock, Tag, ShieldAlert,
} from 'lucide-react';
import { useDashboard, useAsyncData } from 'shared/qamqor-context/DashboardContext';
import { fmtMoney, fmtMoneyFull, fmtDateTime } from 'shared/qamqor-data/format';
import { C } from 'shared/qamqor-data/colors';
import type { RiskLevel } from 'shared/qamqor-data/types';

const RISK: Record<RiskLevel, { label: string; color: string; bg: string }> = {
  high: { label: 'Высокий риск', color: C.red, bg: '#FDE8E8' },
  medium: { label: 'Средний риск', color: C.amberDark, bg: '#FFF8E7' },
  low: { label: 'В норме', color: C.green, bg: '#E8F5E9' },
};

export default function EmployeeDossierDrawer({
  employeeId,
  onClose,
  onOpenLocation,
}: {
  employeeId: string;
  onClose: () => void;
  onOpenLocation?: (id: string) => void;
}) {
  const { source, period } = useDashboard();
  const { data: d, loading } = useAsyncData(
    () => source.getEmployeeDetail(period, employeeId),
    [source, period, employeeId],
  );

  return (
    <div className="fixed inset-0 z-[60] flex justify-end">
      <div className="absolute inset-0" style={{ background: 'rgba(20,18,16,0.45)' }} onClick={onClose} />
      <div className="relative w-full max-w-xl bg-offwhite h-full overflow-y-auto shadow-2xl" style={{ animation: 'drawerIn 0.25s ease' }}>
        {loading || !d ? (
          <div className="flex items-center justify-center h-full text-text-muted gap-2">
            <Loader2 className="w-5 h-5 animate-spin" />
            Загрузка досье…
          </div>
        ) : (
          <>
            {/* Header */}
            <div className="bg-ink text-white px-6 py-5 sticky top-0 z-10">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full flex items-center justify-center" style={{ background: RISK[d.riskLevel].bg }}>
                    <User className="w-6 h-6" style={{ color: RISK[d.riskLevel].color }} />
                  </div>
                  <div>
                    <h2 className="text-xl font-black">{d.stats.employeeName}</h2>
                    <div className="text-xs text-text-muted mt-0.5">{d.role}</div>
                    <button
                      onClick={() => { if (onOpenLocation) { onClose(); onOpenLocation(d.stats.locationId); } }}
                      className="flex items-center gap-1 text-xs text-amber-DEFAULT hover:underline mt-1"
                    >
                      <MapPin className="w-3 h-3" />
                      {d.stats.locationName.replace('Bahandi ', '')}
                    </button>
                  </div>
                </div>
                <button onClick={onClose} className="text-white/60 hover:text-white">
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="flex items-end gap-6 mt-4 flex-wrap">
                <div>
                  <div className="text-3xl font-black" style={{ color: d.stats.medianMultiplier > 2 ? C.red : '#fff' }}>
                    ×{d.stats.medianMultiplier}
                  </div>
                  <div className="text-xs text-text-muted">от медианы сети</div>
                </div>
                <div>
                  <div className="text-3xl font-black text-white">{fmtMoney(d.stats.totalWriteOffs)}</div>
                  <div className="text-xs text-text-muted">{d.stats.writeOffCount} заявок</div>
                </div>
                {d.attributedUnexplained > 0 && (
                  <div>
                    <div className="text-3xl font-black" style={{ color: C.red }}>{fmtMoney(d.attributedUnexplained)}</div>
                    <div className="text-xs text-text-muted">приписано недостачи</div>
                  </div>
                )}
                <span
                  className="badge mb-1.5"
                  style={{ background: RISK[d.riskLevel].bg, color: RISK[d.riskLevel].color }}
                >
                  {d.riskLevel === 'high' && <AlertTriangle className="w-3 h-3" />}
                  {RISK[d.riskLevel].label}
                </span>
              </div>
            </div>

            <div className="px-6 py-5 flex flex-col gap-5">
              {/* Flags */}
              {d.flagTexts.length > 0 && (
                <div className="card p-4">
                  <p className="text-xs font-bold text-text-muted uppercase tracking-wider mb-2">Флаги системы</p>
                  <div className="flex flex-wrap gap-1.5">
                    {d.flagTexts.map((f) => (
                      <span key={f} className="badge badge-red"><AlertTriangle className="w-3 h-3" />{f}</span>
                    ))}
                  </div>
                </div>
              )}

              {/* Weekly trend */}
              {d.weeklyTrend.length > 0 && (
                <div className="card p-5">
                  <div className="flex items-center gap-2 mb-3">
                    <TrendingDown className="w-4 h-4 text-text-muted" />
                    <h3 className="text-sm font-bold text-text-primary">Динамика по неделям</h3>
                    <span className="text-[10px] text-text-muted ml-auto">сумма списаний растёт →</span>
                  </div>
                  <TrendBars data={d.weeklyTrend} high={d.riskLevel === 'high'} />
                </div>
              )}

              {/* By product */}
              <div className="card p-5">
                <div className="flex items-center gap-2 mb-3">
                  <Package className="w-4 h-4 text-text-muted" />
                  <h3 className="text-sm font-bold text-text-primary">По продуктам</h3>
                </div>
                <div className="flex flex-col gap-2.5">
                  {d.byProduct.map((p) => (
                    <div key={p.product}>
                      <div className="flex items-center justify-between text-xs mb-1">
                        <span className="font-medium text-text-primary">{p.product}</span>
                        <span className="text-text-muted">{fmtMoney(p.amount)} · {p.count} заявок · {p.share}%</span>
                      </div>
                      <div className="h-2 bg-stone-100 rounded-full overflow-hidden">
                        <div className="h-full rounded-full" style={{ width: `${p.share}%`, background: p.share > 35 ? C.red : C.amber }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* By shift */}
              <div className="card p-5">
                <div className="flex items-center gap-2 mb-3">
                  <Clock className="w-4 h-4 text-text-muted" />
                  <h3 className="text-sm font-bold text-text-primary">По сменам</h3>
                </div>
                <div className="flex flex-col gap-2.5">
                  {d.byShift.map((s) => {
                    const heavy = s.shift.startsWith('Вечер') && d.riskLevel === 'high';
                    return (
                      <div key={s.shift}>
                        <div className="flex items-center justify-between text-xs mb-1">
                          <span className="text-text-primary">{s.shift}</span>
                          <span className={`font-bold ${heavy ? 'text-theft' : 'text-text-primary'}`}>{s.share}%</span>
                        </div>
                        <div className="h-2 bg-stone-100 rounded-full overflow-hidden">
                          <div className="h-full rounded-full" style={{ width: `${s.share}%`, background: heavy ? C.red : C.green }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* By reason vs network */}
              <div className="card p-5">
                <div className="flex items-center gap-2 mb-3">
                  <Tag className="w-4 h-4 text-text-muted" />
                  <h3 className="text-sm font-bold text-text-primary">Причины</h3>
                  <span className="text-[10px] text-text-muted ml-1">vs сеть</span>
                </div>
                <div className="flex flex-col gap-3">
                  {d.byReason.map((rc) => {
                    const dot = rc.category === 'external' ? C.amberDark : rc.category === 'employee' ? C.red : C.green;
                    const high = rc.share > rc.networkShare * 1.5;
                    return (
                      <div key={rc.category}>
                        <div className="flex items-center justify-between text-xs mb-1">
                          <div className="flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full" style={{ background: dot }} />
                            <span className="font-medium text-text-primary">{rc.label}</span>
                            {high && <span className="badge badge-amber text-[9px] px-1 py-0">×{(rc.share / rc.networkShare).toFixed(1)}</span>}
                          </div>
                          <div className="flex items-center gap-2 text-text-muted">
                            <span className="text-[10px]">сеть {rc.networkShare}%</span>
                            <span className="font-bold text-text-primary">{rc.share}%</span>
                          </div>
                        </div>
                        <div className="relative h-1.5 bg-stone-100 rounded-full overflow-hidden">
                          <div className="absolute left-0 top-0 h-full rounded-full opacity-30" style={{ width: `${rc.networkShare}%`, background: '#8C8780' }} />
                          <div className="absolute left-0 top-0 h-full rounded-full" style={{ width: `${rc.share}%`, background: dot }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Requests */}
              <div className="card p-5">
                <div className="flex items-center gap-2 mb-3">
                  <Camera className="w-4 h-4 text-text-muted" />
                  <h3 className="text-sm font-bold text-text-primary">Заявки сотрудника</h3>
                  <span className="badge badge-ink">{d.requests.length}</span>
                </div>
                {d.requests.length === 0 ? (
                  <p className="text-sm text-text-muted py-2">Заявок за период нет в живом потоке</p>
                ) : (
                  <div className="flex flex-col gap-2">
                    {d.requests.map((req) => {
                      const flagged = req.flags.length > 0;
                      return (
                        <div key={req.id} className="flex items-center gap-3 p-2.5 rounded-xl" style={{ background: flagged ? '#FDE8E8' : '#F6F3EE' }}>
                          <div className="w-9 h-9 rounded-lg bg-white flex items-center justify-center flex-shrink-0">
                            <Camera className="w-4 h-4 text-text-muted" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-semibold text-text-primary truncate">{req.productName}</span>
                              {flagged && <AlertTriangle className="w-3.5 h-3.5 text-theft flex-shrink-0" />}
                            </div>
                            <div className="text-xs text-text-muted truncate">
                              {req.quantity} {req.productType === 'unit' ? 'шт' : 'г'} · {req.reasonLabel}
                            </div>
                          </div>
                          <div className="text-xs text-text-muted flex-shrink-0">{fmtDateTime(req.timestamp)}</div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Action hint */}
              {d.riskLevel === 'high' && (
                <div className="card p-4 flex items-start gap-3" style={{ borderLeft: `4px solid ${C.red}` }}>
                  <ShieldAlert className="w-5 h-5 text-theft flex-shrink-0 mt-0.5" />
                  <div className="text-xs text-text-primary leading-relaxed">
                    <span className="font-bold">Рекомендация:</span> приписано {fmtMoneyFull(d.attributedUnexplained)} необъяснённой недостачи.
                    Открыть расследование по точке {d.stats.locationName.replace('Bahandi ', '')} и приобщить заявки этого сотрудника как доказательство.
                  </div>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

/** Простой бар-спарклайн динамики. */
function TrendBars({ data, high }: { data: number[]; high: boolean }) {
  const max = Math.max(...data, 1);
  return (
    <div className="flex items-end gap-1.5 h-20">
      {data.map((v, i) => (
        <div key={i} className="flex-1 flex flex-col items-center justify-end gap-1">
          <div
            className="w-full rounded-t"
            style={{ height: `${(v / max) * 100}%`, background: high && i >= data.length - 2 ? C.red : C.amber, minHeight: 4 }}
          />
          <span className="text-[9px] text-text-faint">н{i + 1}</span>
        </div>
      ))}
    </div>
  );
}
