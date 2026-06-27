import { useState } from 'react';
import { Users, AlertTriangle, ChevronRight, Search, ArrowUpDown } from 'lucide-react';
import { useDashboard, useAsyncData } from 'shared/qamqor-context/DashboardContext';
import { fmtMoney } from 'shared/qamqor-data/format';
import { C } from 'shared/qamqor-data/colors';
import type { EmployeeStats, RiskLevel } from 'shared/qamqor-data/types';

type SortKey = 'multiplier' | 'amount' | 'count';

function risk(m: number): RiskLevel {
  if (m >= 2.5) return 'high';
  if (m >= 1.5) return 'medium';
  return 'low';
}
const RISK_STYLE: Record<RiskLevel, { label: string; color: string; bg: string }> = {
  high: { label: 'Высокий', color: C.red, bg: '#FDE8E8' },
  medium: { label: 'Средний', color: C.amberDark, bg: '#FFF8E7' },
  low: { label: 'Норма', color: C.green, bg: '#E8F5E9' },
};

export default function EmployeesView({ onOpenEmployee }: { onOpenEmployee: (id: string) => void }) {
  const { source, period } = useDashboard();
  const { data: employees, loading } = useAsyncData(
    () => source.getEmployeeStats(period),
    [source, period],
  );
  const [sort, setSort] = useState<SortKey>('multiplier');
  const [search, setSearch] = useState('');

  const list: EmployeeStats[] = (employees ?? [])
    .filter((e) => e.employeeName.toLowerCase().includes(search.trim().toLowerCase()))
    .sort((a, b) => {
      if (sort === 'amount') return b.totalWriteOffs - a.totalWriteOffs;
      if (sort === 'count') return b.writeOffCount - a.writeOffCount;
      return b.medianMultiplier - a.medianMultiplier;
    });

  const highRisk = (employees ?? []).filter((e) => risk(e.medianMultiplier) === 'high');
  const totalAttention = (employees ?? []).filter((e) => e.medianMultiplier >= 1.5);

  return (
    <div className="flex flex-col gap-5">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-black text-text-primary">Сотрудники</h1>
        <p className="text-text-muted text-sm mt-0.5">
          Реестр сети · сортировка по риску. Клик по строке — полное досье человека.
        </p>
      </div>

      {/* Summary tiles */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        <Tile label="Сотрудников в выборке" value={String((employees ?? []).length)} color={C.ink} />
        <Tile label="Требуют внимания" value={String(totalAttention.length)} color={C.amberDark} sub="×1.5+ от медианы" />
        <Tile label="Высокий риск" value={String(highRisk.length)} color={C.red} sub="×2.5+ — расследовать" />
      </div>

      {/* Toolbar */}
      <div className="card p-3">
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-2 bg-offwhite rounded-xl px-3 py-2 flex-1 min-w-[160px]">
            <Search className="w-3.5 h-3.5 text-text-muted flex-shrink-0" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Поиск сотрудника…"
              className="bg-transparent text-sm text-text-primary placeholder:text-text-faint outline-none w-full"
            />
          </div>
          <div className="flex items-center gap-1.5 text-text-muted text-sm px-1">
            <ArrowUpDown className="w-3.5 h-3.5" />
          </div>
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as SortKey)}
            className="bg-offwhite text-sm text-text-primary rounded-xl px-3 py-2 outline-none border-none cursor-pointer"
          >
            <option value="multiplier">По кратности риска</option>
            <option value="amount">По сумме списаний</option>
            <option value="count">По числу заявок</option>
          </select>
        </div>
      </div>

      {/* Table */}
      {loading && !employees ? (
        <div className="card p-10 text-center text-text-muted">Загрузка реестра…</div>
      ) : list.length === 0 ? (
        <div className="card p-10 text-center text-text-muted">Никого не найдено</div>
      ) : (
        <div className="card overflow-hidden">
          {/* head */}
          <div className="hidden md:flex items-center gap-4 px-4 py-2.5 text-xs text-text-muted border-b border-stone-100 bg-offwhite/50">
            <span className="w-7 flex-shrink-0">#</span>
            <span className="flex-1">Сотрудник</span>
            <span className="w-24 text-right">Кратность</span>
            <span className="w-28 text-right">Списано</span>
            <span className="w-20 text-right">Заявок</span>
            <span className="w-20 text-right">Риск</span>
            <span className="w-4" />
          </div>
          <div className="divide-y divide-stone-50">
            {list.map((e, i) => {
              const r = risk(e.medianMultiplier);
              const rs = RISK_STYLE[r];
              return (
                <button
                  key={e.employeeId}
                  onClick={() => onOpenEmployee(e.employeeId)}
                  className="w-full flex items-center gap-4 p-4 text-left transition-colors hover:bg-stone-50"
                  style={{ borderLeft: r === 'high' ? `4px solid ${C.red}` : '4px solid transparent' }}
                >
                  <span
                    className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-black flex-shrink-0"
                    style={{ background: i === 0 && sort === 'multiplier' ? C.red : '#F6F3EE', color: i === 0 && sort === 'multiplier' ? '#fff' : C.muted }}
                  >
                    {i + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-text-primary">{e.employeeName}</span>
                      {e.flags.includes('duplicate-photo') && (
                        <span className="badge badge-red text-[10px] px-1.5 py-0"><AlertTriangle className="w-2.5 h-2.5" />дубль фото</span>
                      )}
                    </div>
                    <div className="text-xs text-text-muted mt-0.5">{e.locationName.replace('Bahandi ', '')}</div>
                  </div>
                  <div className="w-24 text-right flex-shrink-0">
                    <span className="text-lg font-black" style={{ color: e.medianMultiplier > 2 ? C.red : e.medianMultiplier >= 1.5 ? C.amberDark : C.text }}>
                      ×{e.medianMultiplier}
                    </span>
                  </div>
                  <div className="w-28 text-right flex-shrink-0 hidden md:block">
                    <span className="text-sm font-bold text-text-primary">{fmtMoney(e.totalWriteOffs)}</span>
                  </div>
                  <div className="w-20 text-right flex-shrink-0 hidden md:block text-sm text-text-muted">{e.writeOffCount}</div>
                  <div className="w-20 flex justify-end flex-shrink-0">
                    <span className="badge text-[10px]" style={{ background: rs.bg, color: rs.color }}>{rs.label}</span>
                  </div>
                  <ChevronRight className="w-4 h-4 text-text-muted flex-shrink-0" />
                </button>
              );
            })}
          </div>
        </div>
      )}

      <div className="flex items-center gap-2 text-xs text-text-muted">
        <Users className="w-3.5 h-3.5" />
        Медиана списаний по сотруднику сети: {fmtMoney(45000)} / мес. Кратность = во сколько раз человек выше медианы.
      </div>
    </div>
  );
}

function Tile({ label, value, color, sub }: { label: string; value: string; color: string; sub?: string }) {
  return (
    <div className="card p-4">
      <div className="text-2xl font-black" style={{ color }}>{value}</div>
      <div className="text-xs text-text-muted mt-0.5">{label}</div>
      {sub && <div className="text-[10px] text-text-faint mt-0.5">{sub}</div>}
    </div>
  );
}
