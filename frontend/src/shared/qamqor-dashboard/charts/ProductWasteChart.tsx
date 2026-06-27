import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';
import { C } from 'shared/qamqor-data/colors';
import type { ProductWaste } from 'shared/qamqor-data/types';

interface ProductWasteChartProps {
  data: ProductWaste[];
}

const NORM_COLOR = '#E0DDD9';
const AVG_COLOR = C.green;
const WORST_COLOR = C.red;

function truncate(s: string, n = 8): string {
  return s.length > n ? s.slice(0, n) + '…' : s;
}

export default function ProductWasteChart({ data }: ProductWasteChartProps) {
  const worstName = data[0]?.worstLocationName ?? 'Худшая';

  const chartData = data.map((d) => ({
    product: d.product,
    'Норма': d.norm,
    'Ср. по сети': d.declared,
    [worstName]: d.worstLocation,
  }));

  return (
    <ResponsiveContainer width="100%" height={240}>
      <BarChart
        data={chartData}
        margin={{ top: 4, right: 8, bottom: 4, left: 0 }}
        barGap={2}
        barCategoryGap="30%"
      >
        <CartesianGrid vertical={false} stroke={C.line} strokeWidth={1} />
        <XAxis
          dataKey="product"
          tick={{ fontSize: 10, fill: C.muted }}
          tickFormatter={(v) => truncate(v, 8)}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          tickFormatter={(v) => `${v}%`}
          tick={{ fontSize: 10, fill: C.muted }}
          axisLine={false}
          tickLine={false}
          width={32}
        />
        <Tooltip
          contentStyle={{
            background: 'white',
            border: `1px solid ${C.line}`,
            borderRadius: 10,
            fontSize: 12,
            boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
          }}
          formatter={(value, name) => [`${Number(value).toFixed(2)}%`, String(name)]}
        />
        <Legend
          iconType="circle"
          iconSize={8}
          wrapperStyle={{ fontSize: 11, color: C.muted, paddingTop: 6 }}
        />
        <Bar dataKey="Норма" fill={NORM_COLOR} radius={[4, 4, 0, 0]} maxBarSize={18} />
        <Bar dataKey="Ср. по сети" fill={AVG_COLOR} radius={[4, 4, 0, 0]} maxBarSize={18} />
        <Bar dataKey={worstName} fill={WORST_COLOR} radius={[4, 4, 0, 0]} maxBarSize={18} />
      </BarChart>
    </ResponsiveContainer>
  );
}
