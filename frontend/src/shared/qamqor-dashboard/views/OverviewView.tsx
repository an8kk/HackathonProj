import {
  TrendingDown, Activity, AlertTriangle, Clock, ChevronRight, ArrowRight, User,
} from 'lucide-react';
import { useDashboard, useAsyncData } from 'shared/qamqor-context/DashboardContext';
import { fmtMoney } from 'shared/qamqor-data/format';
import { C, varianceColor } from 'shared/qamqor-data/colors';
import type { DashboardView } from 'shared/qamqor-data/types';
import KpiCard from '../KpiCard';
import ExecutiveSummary from '../ExecutiveSummary';

export default function OverviewView({
  onOpenLocation,
  onOpenEmployee,
  onNavigate,
}: {
  onOpenLocation: (id: string) => void;
  onOpenEmployee: (id: string) => void;
  onNavigate: (v: DashboardView) => void;
}) {
  const { period, source } = useDashboard();
  const kpis = useAsyncData(() => source.getNetworkKpis(period), [source, period]).data;
  const locations = useAsyncData(() => source.getLocations(period), [source, period]).data ?? [];
  const employees = useAsyncData(() => source.getEmployeeStats(period), [source, period]).data ?? [];

  const redLocations = locations.filter((l) => l.status === 'red');
  const topRed = [...locations].sort((a, b) => b.unexplainedDeficit - a.unexplainedDeficit).slice(0, 3);
  const topEmployees = [...employees].sort((a, b) => b.medianMultiplier - a.medianMultiplier).slice(0, 3);
  const totalUnexplained = locations.reduce((s, l) => s + l.unexplainedDeficit, 0);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-black text-text-primary">Обзор сети</h1>
        <p className="text-text-muted text-sm mt-0.5">Главные показатели и точки, требующие внимания прямо сейчас</p>
      </div>

      {/* KPI strip — на тёмной плашке для контраста */}
      <div className="bg-ink rounded-2xl p-5">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {kpis ? (
            <>
              <KpiCard label="Необъяснённая недостача" metric={kpis.unexplainedDeficit} format={fmtMoney} color={C.red} icon={TrendingDown} invert subtitle="за период" />
              <KpiCard label="Ср. AvT variance" metric={kpis.avgVariance} format={(n) => `${n}%`} color={C.amber} icon={Activity} invert subtitle="по сети" />
              <KpiCard label="Точек в красной зоне" metric={kpis.redLocations} format={(n) => String(n)} color={C.red} icon={AlertTriangle} invert subtitle="из 7 точек" />
              <KpiCard label="Заявок на проверке" metric={kpis.pendingReviews} format={(n) => String(n)} color={C.amber} icon={Clock} invert subtitle="ожидают менеджера" />
            </>
          ) : (
            Array.from({ length: 4 }).map((_, i) => <div key={i} className="bg-white/10 rounded-2xl h-[104px] animate-pulse-subtle" />)
          )}
        </div>
      </div>

      <ExecutiveSummary totalUnexplained={totalUnexplained} redLocations={redLocations} fmtMoney={fmtMoney} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top problem locations */}
        <div className="card p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-text-primary">Точки с наибольшей недостачей</h3>
              <p className="text-xs text-text-muted mt-0.5">Куда смотреть в первую очередь</p>
            </div>
            <button onClick={() => onNavigate('locations')} className="text-xs text-amber-dark hover:underline flex items-center gap-1">
              Все точки <ArrowRight className="w-3 h-3" />
            </button>
          </div>
          <div className="flex flex-col gap-2">
            {topRed.map((l) => (
              <button
                key={l.locationId}
                onClick={() => onOpenLocation(l.locationId)}
                className="flex items-center gap-3 p-3 rounded-xl text-left transition-colors hover:bg-stone-50"
                style={{ borderLeft: l.status === 'red' ? `4px solid ${C.red}` : '4px solid transparent', background: '#fff' }}
              >
                <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: varianceColor(l.variancePercent) }} />
                <div className="flex-1 min-w-0">
                  <div className="font-bold text-text-primary text-sm">{l.locationName.replace('Bahandi ', '')}</div>
                  <div className="text-xs text-text-muted">{l.district}</div>
                </div>
                <div className="text-right">
                  <div className="text-base font-black" style={{ color: varianceColor(l.variancePercent) }}>{l.variancePercent}%</div>
                  <div className="text-xs text-text-muted">{l.unexplainedDeficit > 0 ? fmtMoney(l.unexplainedDeficit) : '—'}</div>
                </div>
                <ChevronRight className="w-4 h-4 text-text-muted flex-shrink-0" />
              </button>
            ))}
          </div>
        </div>

        {/* Top suspicious employees */}
        <div className="card p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-text-primary">Топ подозрительных сотрудников</h3>
              <p className="text-xs text-text-muted mt-0.5">Аномальный уровень брака</p>
            </div>
            <button onClick={() => onNavigate('employees')} className="text-xs text-amber-dark hover:underline flex items-center gap-1">
              Все люди <ArrowRight className="w-3 h-3" />
            </button>
          </div>
          <div className="flex flex-col gap-2">
            {topEmployees.map((emp, i) => (
              <button
                key={emp.employeeId}
                onClick={() => onOpenEmployee(emp.employeeId)}
                className="flex items-center gap-3 p-3 rounded-xl text-left transition-colors hover:bg-stone-50"
              >
                <span className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-black flex-shrink-0" style={{ background: i === 0 ? C.red : '#F6F3EE', color: i === 0 ? '#fff' : C.muted }}>
                  {i + 1}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="font-bold text-text-primary text-sm">{emp.employeeName}</span>
                    {emp.medianMultiplier > 2 && <span className="badge badge-red text-[10px] px-1.5 py-0">×{emp.medianMultiplier}</span>}
                  </div>
                  <div className="text-xs text-text-muted">{emp.locationName.replace('Bahandi ', '')} · {fmtMoney(emp.totalWriteOffs)}</div>
                </div>
                <User className="w-4 h-4 text-text-muted flex-shrink-0" />
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
