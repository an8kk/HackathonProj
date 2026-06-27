import { AlertTriangle } from 'lucide-react';
import { useDashboard, useAsyncData } from 'shared/qamqor-context/DashboardContext';
import { PERIOD_LABELS } from 'shared/qamqor-data/types';
import Toolbar from '../Toolbar';
import LocationTable from '../LocationTable';
import VarianceBarChart from '../charts/VarianceBarChart';
import HourlyChart from '../charts/HourlyChart';

export default function LocationsView({ onOpenLocation }: { onOpenLocation: (id: string) => void }) {
  const { period, filters, setFilters, resetFilters, source } = useDashboard();
  const locations = useAsyncData(() => source.getLocations(period), [source, period]).data ?? [];
  const hourly = useAsyncData(() => source.getHourly(period), [source, period]).data ?? [];

  const districts = Array.from(new Set(locations.map((l) => l.district)));
  const varianceData = [...locations]
    .sort((a, b) => b.variancePercent - a.variancePercent)
    .map((l) => ({ name: l.locationName.replace('Bahandi ', '').slice(0, 9), variance: l.variancePercent }));

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-black text-text-primary">Точки сети</h1>
          <p className="text-text-muted text-sm mt-0.5">7 точек · Астана · {PERIOD_LABELS[period].toLowerCase()}. Клик по точке — полная детализация.</p>
        </div>
        <div className="flex items-center gap-3 text-xs text-text-muted no-print">
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-success inline-block" />&lt;2% норма</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-DEFAULT inline-block" />2–3% расследовать</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-theft inline-block" />&gt;3% хищение</span>
        </div>
      </div>

      <div className="no-print">
        <Toolbar filters={filters} onChange={(next) => setFilters(next)} districts={districts} onReset={resetFilters} />
      </div>

      <LocationTable locations={locations} onSelect={onOpenLocation} />

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="card p-5">
          <h3 className="text-sm font-bold text-text-primary mb-1">AvT Variance по точкам</h3>
          <p className="text-xs text-text-muted mb-4">% отклонения факта от теоретической нормы списания</p>
          <VarianceBarChart data={varianceData} />
        </div>
        <div className="card p-5">
          <div className="flex items-start justify-between mb-1">
            <h3 className="text-sm font-bold text-text-primary">Списания по часам · сеть</h3>
            <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-theft-light text-xs font-bold text-theft">
              <AlertTriangle className="w-3.5 h-3.5" />
              Всплеск 22–23ч
            </div>
          </div>
          <p className="text-xs text-text-muted mb-4">Ночной пик перед закрытием — классика прикрытия недостачи</p>
          <HourlyChart data={hourly} valueLabel="Сарыарка" />
        </div>
      </div>
    </div>
  );
}
