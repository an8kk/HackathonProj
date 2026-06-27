import React, {
  createContext, useContext, useMemo, useState, useEffect, useRef,
} from 'react';
import type { Period, LocationStatus } from 'shared/qamqor-data/types';
import type { DashboardDataSource } from 'shared/qamqor-data/datasource';
import { createDataSource } from 'shared/qamqor-data/mockDataSource';
import { useApp } from './AppContext';

export type LocationSort = 'variance' | 'deficit' | 'name';

export interface DashboardFilters {
  sort: LocationSort;
  district: string | 'all';
  status: LocationStatus | 'all';
  search: string;
}

interface DashboardContextType {
  period: Period;
  setPeriod: (p: Period) => void;
  filters: DashboardFilters;
  setFilters: React.Dispatch<React.SetStateAction<DashboardFilters>>;
  resetFilters: () => void;
  source: DashboardDataSource;
}

const DEFAULT_FILTERS: DashboardFilters = {
  sort: 'variance',
  district: 'all',
  status: 'all',
  search: '',
};

const DashboardContext = createContext<DashboardContextType | null>(null);

export function DashboardProvider({ children }: { children: React.ReactNode }) {
  const { requests, pendingCount } = useApp();
  const [period, setPeriod] = useState<Period>('month');
  const [filters, setFilters] = useState<DashboardFilters>(DEFAULT_FILTERS);

  // Источник пересоздаётся при изменении живых данных (заявки/счётчики),
  // поэтому дашборд реагирует на поток сотрудник→менеджер в реальном времени.
  const source = useMemo(
    () => createDataSource({ requests, pendingCount }),
    [requests, pendingCount],
  );

  const resetFilters = () => setFilters(DEFAULT_FILTERS);

  return (
    <DashboardContext.Provider
      value={{ period, setPeriod, filters, setFilters, resetFilters, source }}
    >
      {children}
    </DashboardContext.Provider>
  );
}

export function useDashboard() {
  const ctx = useContext(DashboardContext);
  if (!ctx) throw new Error('useDashboard must be used within DashboardProvider');
  return ctx;
}

/**
 * Универсальный async-хук для запросов к источнику данных.
 * Возвращает данные, флаг загрузки и ошибку. При смене зависимостей перезапрашивает,
 * игнорируя устаревшие ответы (защита от гонок) — как при работе с настоящим API.
 */
export function useAsyncData<T>(
  fetcher: () => Promise<T>,
  deps: unknown[],
): { data: T | null; loading: boolean; error: string | null } {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const reqId = useRef(0);

  useEffect(() => {
    const id = ++reqId.current;
    setLoading(true);
    setError(null);
    fetcher()
      .then((result) => {
        if (id === reqId.current) {
          setData(result);
          setLoading(false);
        }
      })
      .catch((e) => {
        if (id === reqId.current) {
          setError(e instanceof Error ? e.message : 'Ошибка загрузки');
          setLoading(false);
        }
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return { data, loading, error };
}
