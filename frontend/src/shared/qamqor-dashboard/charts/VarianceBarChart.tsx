import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Cell,
  ReferenceLine,
  Tooltip,
} from 'recharts';
import { C, varianceColor } from 'shared/qamqor-data/colors';

interface VarianceBarChartProps {
  data: { name: string; variance: number }[];
}

interface TooltipPayloadEntry {
  value: number;
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: TooltipPayloadEntry[];
  label?: string;
}

function CustomTooltip({ active, payload, label }: CustomTooltipProps) {
  if (!active || !payload || !payload.length) return null;
  const v = payload[0].value;
  return (
    <div
      style={{
        background: 'white',
        border: `1px solid ${C.line}`,
        borderRadius: 10,
        padding: '8px 12px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
      }}
    >
      <div style={{ fontSize: 11, color: C.muted, marginBottom: 2 }}>{label}</div>
      <div style={{ fontSize: 15, fontWeight: 800, color: varianceColor(v) }}>
        {v.toFixed(2)}%
      </div>
    </div>
  );
}

export default function VarianceBarChart({ data }: VarianceBarChartProps) {
  return (
    <ResponsiveContainer width="100%" height={240}>
      <BarChart
        data={data}
        layout="vertical"
        margin={{ top: 4, right: 16, bottom: 4, left: 8 }}
      >
        <CartesianGrid horizontal={false} stroke={C.line} strokeWidth={1} />
        <XAxis
          type="number"
          domain={[0, 7]}
          tickCount={8}
          tickFormatter={(v) => `${v}%`}
          tick={{ fontSize: 10, fill: C.muted }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          type="category"
          dataKey="name"
          width={90}
          tick={{ fontSize: 11, fill: C.text }}
          axisLine={false}
          tickLine={false}
        />
        <Tooltip content={<CustomTooltip />} cursor={{ fill: C.line, opacity: 0.5 }} />

        {/* Reference lines */}
        <ReferenceLine
          x={2}
          stroke={C.amber}
          strokeDasharray="4 3"
          strokeWidth={1.5}
        />
        <ReferenceLine
          x={3}
          stroke={C.red}
          strokeDasharray="4 3"
          strokeWidth={1.5}
        />

        <Bar dataKey="variance" radius={[0, 4, 4, 0]} maxBarSize={20}>
          {data.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={varianceColor(entry.variance)} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
