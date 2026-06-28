import { ShieldAlert, ShieldCheck } from 'lucide-react';
import type { LocationStats } from 'shared/qamqor-data/types';

interface ExecutiveSummaryProps {
  totalUnexplained: number;
  redLocations: LocationStats[];
  fmtMoney: (n: number) => string;
}

export default function ExecutiveSummary({
  totalUnexplained,
  redLocations,
  fmtMoney,
}: ExecutiveSummaryProps) {
  const hasRed = redLocations.length > 0;
  const firstRed = redLocations[0];

  if (hasRed) {
    return (
      <div className="rounded-2xl p-5 bg-red-light border border-red/20 flex items-start gap-4">
        <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-red/10 flex items-center justify-center">
          <ShieldAlert className="w-5 h-5 text-red" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline gap-3 flex-wrap">
            <span className="text-2xl font-black text-red leading-none">
              {fmtMoney(totalUnexplained)}
            </span>
            <span className="text-sm font-semibold text-red/80">под угрозой</span>
          </div>
          <p className="text-sm text-charcoal mt-1.5 leading-snug">
            {redLocations.length}{' '}
            {redLocations.length === 1
              ? 'точка требует'
              : redLocations.length < 5
              ? 'точки требуют'
              : 'точек требуют'}{' '}
            расследования
            {firstRed && (
              <>
                {' '}· рекомендация: проверить{' '}
                <span className="font-bold">{firstRed.locationName}</span>
              </>
            )}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl p-5 bg-green/10 border border-green/20 flex items-start gap-4">
      <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-green/10 flex items-center justify-center">
        <ShieldCheck className="w-5 h-5 text-green" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-2xl font-black text-green leading-none">Сеть под контролем</div>
        <p className="text-sm text-charcoal mt-1.5">
          Все точки работают в пределах нормы. Подозрительных отклонений не выявлено.
        </p>
      </div>
    </div>
  );
}
