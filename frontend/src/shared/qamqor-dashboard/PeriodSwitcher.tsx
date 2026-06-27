import { Period, PERIOD_LABELS } from 'shared/qamqor-data/types';

interface PeriodSwitcherProps {
  period: Period;
  onChange: (p: Period) => void;
}

const PERIODS: Period[] = ['today', 'week', 'month', 'quarter'];

export default function PeriodSwitcher({ period, onChange }: PeriodSwitcherProps) {
  return (
    <div className="flex items-center bg-white/10 rounded-xl p-1 gap-0.5">
      {PERIODS.map((p) => {
        const active = p === period;
        return (
          <button
            key={p}
            onClick={() => onChange(p)}
            className={
              active
                ? 'px-3 py-1.5 text-xs font-bold rounded-lg bg-amber text-ink transition-colors'
                : 'px-3 py-1.5 text-xs font-medium rounded-lg text-white/60 hover:text-white/90 transition-colors'
            }
          >
            {PERIOD_LABELS[p]}
          </button>
        );
      })}
    </div>
  );
}
