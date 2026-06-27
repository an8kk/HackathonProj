import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine,
} from 'recharts';
import { C } from 'shared/qamqor-data/colors';
import type { HourlyPoint } from 'shared/qamqor-data/types';

interface HourlyChartProps {
  data: HourlyPoint[];
  valueLabel: string;
  benchmarkLabel?: string;
}

function fmtTenge(v: number): string {
  if (v >= 1_000_000) return `₸${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000) return `₸${(v / 1_000).toFixed(0)}K`;
  return `₸${v}`;
}

interface TooltipEntry {
  name: string;
  value: number;
  color: string;
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: TooltipEntry[];
  label?: string;
}

function CustomTooltip({ active, payload, label }: CustomTooltipProps) {
  if (!active || !payload || !payload.length) return null;
  return (
    <div
      style={{
        background: 'white',
        border: `1px solid ${C.line}`,
        borderRadius: 10,
        padding: '8px 12px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
        minWidth: 140,
      }}
    >
      <div style={{ fontSize: 11, color: C.muted, marginBottom: 6 }}>{label}</div>
      {payload.map((entry) => (
        <div
          key={entry.name}
          style={{ display: 'flex', justifyContent: 'space-between', gap: 16, fontSize: 12 }}
        >
          <span style={{ color: entry.color }}>{entry.name}</span>
          <span style={{ fontWeight: 700, color: C.text }}>{fmtTenge(entry.value)}</span>
        </div>
      ))}
    </div>
  );
}

export default function HourlyChart({
  data,
  valueLabel,
  benchmarkLabel = 'Ср. по сети',
}: HourlyChartProps) {
  return (
    <ResponsiveContainer width="100%" height={220}>
      <LineChart data={data} margin={{ top: 4, right: 8, bottom: 4, left: 0 }}>
        <CartesianGrid stroke={C.line} strokeWidth={1} vertical={false} />
        <XAxis
          dataKey="hour"
          tick={{ fontSize: 10, fill: C.muted }}
          tickFormatter={(v, i) => (i % 4 === 0 ? v : '')}
          axisLine={false}
          tickLine={false}
          interval={0}
        />
        <YAxis
          tickFormatter={(v) => (v >= 1000 ? `${(v / 1000).toFixed(0)}K` : `${Math.round(v)}`)}
          tick={{ fontSize: 10, fill: C.muted }}
          axisLine={false}
          tickLine={false}
          width={40}
        />
        <Tooltip content={<CustomTooltip />} />
        <Legend
          iconType="plainline"
          iconSize={16}
          wrapperStyle={{ fontSize: 11, color: C.muted, paddingTop: 6 }}
        />

        {/* Night spike reference */}
        <ReferenceLine
          x="22:00"
          stroke={C.red}
          strokeDasharray="4 3"
          strokeWidth={1.5}
        />

        <Line
          type="monotone"
          dataKey="value"
          name={valueLabel}
          stroke={C.red}
          strokeWidth={2.5}
          dot={false}
          activeDot={{ r: 4, fill: C.red }}
        />
        <Line
          type="monotone"
          dataKey="benchmark"
          name={benchmarkLabel}
          stroke={C.green}
          strokeWidth={1.5}
          strokeDasharray="5 3"
          dot={false}
          activeDot={{ r: 3, fill: C.green }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
