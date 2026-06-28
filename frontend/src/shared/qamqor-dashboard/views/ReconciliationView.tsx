import { Info } from 'lucide-react';
import { useDashboard, useAsyncData } from 'shared/qamqor-context/DashboardContext';
import { PERIOD_LABELS } from 'shared/qamqor-data/types';
import ReconciliationSection from '../ReconciliationSection';

export default function ReconciliationView({ onOpenLocation }: { onOpenLocation: (id: string) => void }) {
  const { period, source } = useDashboard();
  const locations = useAsyncData(() => source.getLocations(period), [source, period]).data ?? [];

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="text-2xl font-black text-charcoal">Сверка с реальностью</h1>
        <p className="text-muted text-sm mt-0.5">
          {PERIOD_LABELS[period]} · как заявки сотрудников превращаются в доказанное хищение
        </p>
      </div>

      {/* How it works */}
      <div className="card p-5 bg-offwhite/50">
        <div className="flex items-center gap-2 mb-3">
          <Info className="w-4 h-4 text-orange-dark" />
          <h3 className="text-sm font-bold text-charcoal">Как считается необъяснённая недостача</h3>
        </div>
        <div className="text-sm text-charcoal leading-relaxed font-mono bg-white rounded-xl p-4 border border-card-border overflow-x-auto">
          <div>остаток на начало + приёмка − продажи (по техкартам iiko) − одобренные списания</div>
          <div className="text-muted">= сколько <b className="text-charcoal">должно</b> остаться на складе</div>
          <div className="mt-2">должно остаться − <b className="text-red">факт по инвентаризации</b></div>
          <div className="text-red font-bold">= необъяснённая недостача = хищение</div>
        </div>
        <p className="text-xs text-muted mt-3 leading-relaxed">
          Система не верит сотруднику на слово. Любое списание сверяется с реальными остатками из iiko и инвентаризации.
          Соврал в любую сторону — разница всплывает здесь.
        </p>
      </div>

      <ReconciliationSection locations={locations} onOpenLocation={onOpenLocation} />
    </div>
  );
}
