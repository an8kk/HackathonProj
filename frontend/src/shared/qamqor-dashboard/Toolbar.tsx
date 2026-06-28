import { Search, X } from 'lucide-react';

type SortKey = 'variance' | 'deficit' | 'name';
type StatusFilter = 'all' | 'green' | 'amber' | 'red';

interface Filters {
  sort: SortKey;
  district: string;
  status: StatusFilter;
  search: string;
}

interface ToolbarProps {
  filters: Filters;
  onChange: (next: Filters) => void;
  districts: string[];
  onReset: () => void;
}

const DEFAULT_FILTERS: Filters = {
  sort: 'variance',
  district: 'all',
  status: 'all',
  search: '',
};

// Сортировка — это не «фильтр», поэтому её смена не показывает «Сбросить».
function hasActiveFilters(filters: Filters): boolean {
  return (
    filters.district !== DEFAULT_FILTERS.district ||
    filters.status !== DEFAULT_FILTERS.status ||
    filters.search.trim() !== ''
  );
}

export default function Toolbar({ filters, onChange, districts, onReset }: ToolbarProps) {
  const update = <K extends keyof Filters>(key: K, value: Filters[K]) =>
    onChange({ ...filters, [key]: value });

  const dirty = hasActiveFilters(filters);

  return (
    <div className="card p-3">
      <div className="flex flex-wrap items-center gap-2">
        {/* Search */}
        <div className="flex items-center gap-2 bg-offwhite rounded-xl px-3 py-2 flex-1 min-w-[160px]">
          <Search className="w-3.5 h-3.5 text-muted flex-shrink-0" />
          <input
            type="text"
            placeholder="Поиск точки…"
            value={filters.search}
            onChange={(e) => update('search', e.target.value)}
            className="bg-transparent text-sm text-charcoal placeholder:text-muted outline-none w-full"
          />
        </div>

        {/* Sort */}
        <select
          value={filters.sort}
          onChange={(e) => update('sort', e.target.value as SortKey)}
          className="bg-offwhite text-sm text-charcoal rounded-xl px-3 py-2 outline-none border-none cursor-pointer"
        >
          <option value="variance">По variance</option>
          <option value="deficit">По недостаче</option>
          <option value="name">По названию</option>
        </select>

        {/* District */}
        <select
          value={filters.district}
          onChange={(e) => update('district', e.target.value)}
          className="bg-offwhite text-sm text-charcoal rounded-xl px-3 py-2 outline-none border-none cursor-pointer"
        >
          <option value="all">Все районы</option>
          {districts.map((d) => (
            <option key={d} value={d}>
              {d}
            </option>
          ))}
        </select>

        {/* Status */}
        <select
          value={filters.status}
          onChange={(e) => update('status', e.target.value as StatusFilter)}
          className="bg-offwhite text-sm text-charcoal rounded-xl px-3 py-2 outline-none border-none cursor-pointer"
        >
          <option value="all">Все статусы</option>
          <option value="green">Норма</option>
          <option value="amber">Расследовать</option>
          <option value="red">Хищение</option>
        </select>

        {/* Reset */}
        {dirty && (
          <button
            onClick={onReset}
            className="flex items-center gap-1.5 text-sm text-muted hover:text-charcoal transition-colors px-3 py-2 rounded-xl hover:bg-offwhite"
          >
            <X className="w-3.5 h-3.5" />
            Сбросить
          </button>
        )}
      </div>
    </div>
  );
}
