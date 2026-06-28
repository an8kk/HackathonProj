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
          <h1 className="text-2xl font-black text-charcoal">Ð¢Ð¾Ñ‡ÐºÐ¸ ÑÐµÑ‚Ð¸</h1>
          <p className="text-muted text-sm mt-0.5">7 Ñ‚Ð¾Ñ‡ÐµÐº Â· ÐÑÑ‚Ð°Ð½Ð° Â· {PERIOD_LABELS[period].toLowerCase()}. ÐšÐ»Ð¸Ðº Ð¿Ð¾ Ñ‚Ð¾Ñ‡ÐºÐµ â€” Ð¿Ð¾Ð»Ð½Ð°Ñ Ð´ÐµÑ‚Ð°Ð»Ð¸Ð·Ð°Ñ†Ð¸Ñ.</p>
        </div>
        <div className="flex items-center gap-3 text-xs text-muted no-print">
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-green inline-block" />&lt;2% Ð½Ð¾Ñ€Ð¼Ð°</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-orange inline-block" />2â€“3% Ñ€Ð°ÑÑÐ»ÐµÐ´Ð¾Ð²Ð°Ñ‚ÑŒ</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red inline-block" />&gt;3% Ñ…Ð¸Ñ‰ÐµÐ½Ð¸Ðµ</span>
        </div>
      </div>

      <div className="no-print">
        <Toolbar filters={filters} onChange={(next) => setFilters(next)} districts={districts} onReset={resetFilters} />
      </div>

      <LocationTable locations={locations} onSelect={onOpenLocation} />

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="card p-5">
          <h3 className="text-sm font-bold text-charcoal mb-1">AvT Variance Ð¿Ð¾ Ñ‚Ð¾Ñ‡ÐºÐ°Ð¼</h3>
          <p className="text-xs text-muted mb-4">% Ð¾Ñ‚ÐºÐ»Ð¾Ð½ÐµÐ½Ð¸Ñ Ñ„Ð°ÐºÑ‚Ð° Ð¾Ñ‚ Ñ‚ÐµÐ¾Ñ€ÐµÑ‚Ð¸Ñ‡ÐµÑÐºÐ¾Ð¹ Ð½Ð¾Ñ€Ð¼Ñ‹ ÑÐ¿Ð¸ÑÐ°Ð½Ð¸Ñ</p>
          <VarianceBarChart data={varianceData} />
        </div>
        <div className="card p-5">
          <div className="flex items-start justify-between mb-1">
            <h3 className="text-sm font-bold text-charcoal">Ð¡Ð¿Ð¸ÑÐ°Ð½Ð¸Ñ Ð¿Ð¾ Ñ‡Ð°ÑÐ°Ð¼ Â· ÑÐµÑ‚ÑŒ</h3>
            <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-red-light text-xs font-bold text-red">
              <AlertTriangle className="w-3.5 h-3.5" />
              Ð’ÑÐ¿Ð»ÐµÑÐº 22â€“23Ñ‡
            </div>
          </div>
          <p className="text-xs text-muted mb-4">ÐÐ¾Ñ‡Ð½Ð¾Ð¹ Ð¿Ð¸Ðº Ð¿ÐµÑ€ÐµÐ´ Ð·Ð°ÐºÑ€Ñ‹Ñ‚Ð¸ÐµÐ¼ â€” ÐºÐ»Ð°ÑÑÐ¸ÐºÐ° Ð¿Ñ€Ð¸ÐºÑ€Ñ‹Ñ‚Ð¸Ñ Ð½ÐµÐ´Ð¾ÑÑ‚Ð°Ñ‡Ð¸</p>
          <HourlyChart data={hourly} valueLabel="Ð¡Ð°Ñ€Ñ‹Ð°Ñ€ÐºÐ°" />
        </div>
      </div>
    </div>
  );
}
