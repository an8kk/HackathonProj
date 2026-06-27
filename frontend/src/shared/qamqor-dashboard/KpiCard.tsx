import type { LucideIcon } from 'lucide-react';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { C } from 'shared/qamqor-data/colors';
import type { Metric } from 'shared/qamqor-data/types';
import Sparkline from './Sparkline';

interface KpiCardProps {
  label: string;
  metric: Metric;
  format: (n: number) => string;
  color: string;
  icon: LucideIcon;
  invert?: boolean;
  subtitle?: string;
}

export default function KpiCard({
  label,
  metric,
  format,
  color,
  icon: Icon,
  invert = false,
  subtitle,
}: KpiCardProps) {
  const delta =
    metric.prev !== 0 ? ((metric.value - metric.prev) / metric.prev) * 100 : 0;
  const isFlat = Math.abs(delta) < 0.5;
  const isUp = delta > 0;

  let trendColor: string;
  if (isFlat) {
    trendColor = C.muted;
  } else if (invert) {
    trendColor = isUp ? C.red : C.green;
  } else {
    trendColor = isUp ? C.green : C.red;
  }

  const TrendIcon = isFlat ? Minus : isUp ? TrendingUp : TrendingDown;

  return (
    <div className="bg-white/10 rounded-2xl p-4 flex flex-col gap-2">
      {/* Header row */}
      <div className="flex items-center gap-1.5">
        <Icon style={{ color }} className="w-4 h-4 flex-shrink-0" />
        <span className="text-xs text-white/60 leading-none">{label}</span>
      </div>

      {/* Value + sparkline row */}
      <div className="flex items-end justify-between gap-2">
        <span
          className="text-2xl font-black leading-none tracking-tight"
          style={{ color }}
        >
          {format(metric.value)}
        </span>
        <Sparkline data={metric.spark} color={trendColor} width={72} height={24} />
      </div>

      {/* Subtitle */}
      {subtitle && (
        <div className="text-xs text-white/40 leading-none">{subtitle}</div>
      )}

      {/* Trend row */}
      <div className="flex items-center gap-1" style={{ color: trendColor }}>
        <TrendIcon className="w-3 h-3" />
        <span className="text-xs font-semibold">
          {isFlat ? 'без изменений' : `${isUp ? '+' : ''}${delta.toFixed(1)}%`}
        </span>
      </div>
    </div>
  );
}
