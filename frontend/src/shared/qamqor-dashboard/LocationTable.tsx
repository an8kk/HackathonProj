import { AlertTriangle, MapPin, ChevronRight, ShieldAlert, SearchX } from 'lucide-react';
import { useDashboard } from 'shared/qamqor-context/DashboardContext';
import { useInvestigations } from 'shared/qamqor-context/InvestigationsContext';
import { fmtMoney } from 'shared/qamqor-data/format';
import { varianceColor, statusColor, C } from 'shared/qamqor-data/colors';
import { INVESTIGATION_STATUS_LABELS } from 'shared/qamqor-data/types';
import type { LocationStats } from 'shared/qamqor-data/types';

export function applyFilters(
  locations: LocationStats[],
  filters: ReturnType<typeof useDashboard>['filters'],
): LocationStats[] {
  let list = [...locations];
  if (filters.search.trim()) {
    const q = filters.search.trim().toLowerCase();
    list = list.filter((l) => l.locationName.toLowerCase().includes(q));
  }
  if (filters.district !== 'all') list = list.filter((l) => l.district === filters.district);
  if (filters.status !== 'all') list = list.filter((l) => l.status === filters.status);

  list.sort((a, b) => {
    if (filters.sort === 'name') return a.locationName.localeCompare(b.locationName, 'ru');
    if (filters.sort === 'deficit') return b.unexplainedDeficit - a.unexplainedDeficit;
    return b.variancePercent - a.variancePercent; // variance (default)
  });
  return list;
}

export default function LocationTable({
  locations,
  activeId,
  onSelect,
}: {
  locations: LocationStats[];
  activeId?: string | null;
  onSelect: (id: string) => void;
}) {
  const { filters } = useDashboard();
  const { byLocation } = useInvestigations();
  const rows = applyFilters(locations, filters);

  if (rows.length === 0) {
    return (
      <div className="card p-10 flex flex-col items-center text-center">
        <SearchX className="w-8 h-8 text-text-faint mb-2" />
        <p className="text-sm font-medium text-text-primary">Ничего не найдено</p>
        <p className="text-xs text-text-muted mt-1">Измените фильтры или сбросьте их.</p>
      </div>
    );
  }

  return (
    <div className="card overflow-hidden">
      <div className="divide-y divide-stone-50">
        {rows.map((stat) => {
          const isRed = stat.status === 'red';
          const inv = byLocation(stat.locationId);
          const active = activeId === stat.locationId;
          return (
            <button
              key={stat.locationId}
              onClick={() => onSelect(stat.locationId)}
              className="w-full flex items-center gap-4 p-4 text-left transition-colors hover:bg-stone-50"
              style={{
                background: active ? '#F6F3EE' : '#fff',
                borderLeft: isRed ? `4px solid ${C.red}` : '4px solid transparent',
              }}
            >
              <span
                className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                style={{
                  background: statusColor(stat.status),
                  boxShadow: isRed ? `0 0 0 3px ${C.red}30` : undefined,
                }}
              />

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-bold text-text-primary">{stat.locationName}</span>
                  {isRed && (
                    <span className="badge badge-red"><AlertTriangle className="w-3 h-3" />Хищение</span>
                  )}
                  {inv && (
                    <span className="badge badge-amber">
                      <ShieldAlert className="w-3 h-3" />{INVESTIGATION_STATUS_LABELS[inv.status]}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-1.5 text-xs text-text-muted mt-0.5">
                  <MapPin className="w-3 h-3" />{stat.district}
                </div>
              </div>

              <div className="text-right flex-shrink-0">
                <div className="text-xl font-black" style={{ color: varianceColor(stat.variancePercent) }}>
                  {stat.variancePercent}%
                </div>
                <div className="text-xs text-text-muted">AvT variance</div>
              </div>

              <div className="text-right flex-shrink-0 w-24 hidden md:block">
                <div className={`text-sm font-bold ${isRed ? 'text-theft' : 'text-text-muted'}`}>
                  {fmtMoney(stat.unexplainedDeficit)}
                </div>
                <div className="text-xs text-text-muted">необъяснённо</div>
              </div>

              <div className="w-28 hidden lg:block">
                <div className="h-1.5 bg-stone-100 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full"
                    style={{ width: `${Math.min(stat.variancePercent / 7 * 100, 100)}%`, background: varianceColor(stat.variancePercent) }}
                  />
                </div>
              </div>

              <ChevronRight className="w-4 h-4 text-text-muted flex-shrink-0" />
            </button>
          );
        })}
      </div>
    </div>
  );
}
