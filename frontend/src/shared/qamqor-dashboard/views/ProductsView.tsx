import { useState } from 'react';
import { Loader2, ChevronDown, ChevronUp, AlertTriangle, Info, Scale, Package } from 'lucide-react';

import { useDashboard, useAsyncData } from 'shared/qamqor-context/DashboardContext';
import { fmtMoney, fmtMoneyFull, pluralRu } from 'shared/qamqor-data/format';
import { C } from 'shared/qamqor-data/colors';
import type { ProductDetail, ProductLocationShare } from 'shared/qamqor-data/types';

/* ─────────────────────────── Sub-components ─────────────────────────── */

interface LocationRowProps {
  loc: ProductLocationShare;
  norm: number;
  isUnit: boolean;
}

function LocationRow({ loc, norm, isUnit }: LocationRowProps) {
  const overNorm = loc.overNorm;
  const barMax = Math.max(loc.declared, norm, 1);
  const normWidth = isUnit ? 0 : Math.min((norm / barMax) * 100, 100);
  const declaredWidth = Math.min((loc.declared / barMax) * 100, 100);

  return (
    <div className="py-2 border-b border-stone-50 last:border-0">
      <div className="flex items-center justify-between mb-1">
        <span
          className="text-xs font-medium"
          style={{ color: overNorm ? C.red : C.text }}
        >
          {loc.locationName.replace('Bahandi ', '')}
        </span>
        <div className="flex items-center gap-1.5">
          {overNorm && (
            <AlertTriangle className="w-3 h-3" style={{ color: C.red }} />
          )}
          <span
            className="text-xs font-bold"
            style={{ color: overNorm ? C.red : C.muted }}
          >
            {loc.declared}%
          </span>
        </div>
      </div>
      {!isUnit && (
        <div className="relative h-2 bg-stone-100 rounded-full overflow-hidden">
          <div
            className="absolute left-0 top-0 h-full rounded-full opacity-30"
            style={{ width: `${normWidth}%`, background: C.muted }}
          />
          <div
            className="absolute left-0 top-0 h-full rounded-full"
            style={{
              width: `${declaredWidth}%`,
              background: loc.declared > norm ? C.red : C.green,
            }}
          />
        </div>
      )}
    </div>
  );
}

/* ─────────────────────────── Weight card ─────────────────────────── */

interface WeightCardProps {
  detail: ProductDetail;
}

function WeightCard({ detail }: WeightCardProps) {
  const [expanded, setExpanded] = useState(false);

  const barMax = Math.max(detail.networkDeclared, detail.norm, 1);
  const normWidth = Math.min((detail.norm / barMax) * 100, 100);
  const networkWidth = Math.min((detail.networkDeclared / barMax) * 100, 100);
  const networkOverNorm = detail.networkDeclared > detail.norm;
  const overNormLocations = detail.locations.filter((l) => l.overNorm).length;
  const isSuspect = detail.worstLocationName.toLowerCase().includes('сарыарка');

  return (
    <div className={`card p-5 ${isSuspect ? 'ring-1 ring-red-200' : ''}`}>
      {/* Header */}
      <div className="flex items-start justify-between gap-2 mb-3">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-bold text-text-primary">{detail.product}</span>
          <span className="badge badge-ink text-[10px]">
            <Scale className="w-2.5 h-2.5" />
            весовой
          </span>
          {overNormLocations > 0 && (
            <span className="badge badge-red text-[10px]">
              {overNormLocations} {pluralRu(overNormLocations, ['точка', 'точки', 'точек'])} сверх нормы
            </span>
          )}
        </div>
        <div className="text-right flex-shrink-0">
          <div className="text-xs text-text-muted">списано</div>
          <div className="text-sm font-bold text-text-primary">{fmtMoney(detail.totalCost)}</div>
        </div>
      </div>

      {/* Norms row */}
      <div className="flex items-center gap-4 text-xs text-text-muted mb-2 flex-wrap">
        <span>Норма отхода: <strong className="text-text-primary">{detail.norm}%</strong></span>
        <span>Ср. по сети: <strong style={{ color: networkOverNorm ? C.red : C.green }}>{detail.networkDeclared}%</strong></span>
      </div>

      {/* Bar: network vs norm */}
      <div className="mb-3">
        <div className="flex justify-between text-[10px] text-text-muted mb-1">
          <span>Сеть vs норма</span>
          <span>{detail.networkDeclared}% / {detail.norm}%</span>
        </div>
        <div className="relative h-2 bg-stone-100 rounded-full overflow-hidden">
          <div
            className="absolute left-0 top-0 h-full rounded-full opacity-30"
            style={{ width: `${normWidth}%`, background: C.muted }}
          />
          <div
            className="absolute left-0 top-0 h-full rounded-full"
            style={{
              width: `${networkWidth}%`,
              background: networkOverNorm ? C.red : C.green,
            }}
          />
        </div>
      </div>

      {/* Worst location */}
      <div
        className="flex items-center gap-2 px-3 py-2 rounded-xl mb-3 text-xs"
        style={{ background: '#FDE8E8' }}
      >
        <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" style={{ color: C.red }} />
        <span style={{ color: C.red }}>
          Худшая точка: <strong>{detail.worstLocationName.replace('Bahandi ', '')}</strong> — {detail.worstDeclared}%
          {detail.worstDeclared > detail.norm && ` (превышение на ${(detail.worstDeclared - detail.norm).toFixed(1)}%)`}
        </span>
      </div>

      {/* Cost summary */}
      <div className="flex items-center gap-4 flex-wrap mb-3">
        <div>
          <div className="text-[10px] text-text-muted uppercase tracking-wide">Списано</div>
          <div className="text-sm font-bold text-text-primary">{fmtMoneyFull(detail.totalCost)}</div>
        </div>
        {detail.overNormCost > 0 && (
          <div>
            <div className="text-[10px] uppercase tracking-wide" style={{ color: C.red }}>Сверх нормы</div>
            <div className="text-sm font-bold" style={{ color: C.red }}>{fmtMoneyFull(detail.overNormCost)}</div>
          </div>
        )}
      </div>

      {/* Expand toggle */}
      <button
        onClick={() => setExpanded((v) => !v)}
        className="flex items-center gap-1 text-xs font-medium w-full justify-center py-1.5 rounded-lg hover:bg-stone-50 transition-colors"
        style={{ color: C.muted }}
      >
        {expanded ? (
          <>
            <ChevronUp className="w-3.5 h-3.5" />
            Скрыть точки
          </>
        ) : (
          <>
            <ChevronDown className="w-3.5 h-3.5" />
            Все точки ({detail.locations.length})
          </>
        )}
      </button>

      {expanded && (
        <div className="mt-2 pt-2 border-t border-stone-100">
          {detail.locations.map((loc) => (
            <LocationRow key={loc.locationName} loc={loc} norm={detail.norm} isUnit={false} />
          ))}
        </div>
      )}
    </div>
  );
}

/* ─────────────────────────── Unit card ─────────────────────────── */

interface UnitCardProps {
  detail: ProductDetail;
}

function UnitCard({ detail }: UnitCardProps) {
  const [expanded, setExpanded] = useState(false);

  const overNormLocations = detail.locations.filter((l) => l.overNorm).length;
  const isSuspect = detail.worstLocationName.toLowerCase().includes('сарыарка');

  return (
    <div className={`card p-5 ${isSuspect ? 'ring-1 ring-red-200' : ''}`}>
      {/* Header */}
      <div className="flex items-start justify-between gap-2 mb-3">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-bold text-text-primary">{detail.product}</span>
          <span className="badge badge-amber text-[10px]">
            <Package className="w-2.5 h-2.5" />
            штучный
          </span>
          {overNormLocations > 0 && (
            <span className="badge badge-red text-[10px]">
              {overNormLocations} {pluralRu(overNormLocations, ['точка', 'точки', 'точек'])} подозрительны
            </span>
          )}
        </div>
        <div className="text-right flex-shrink-0">
          <div className="text-xs text-text-muted">списано</div>
          <div className="text-sm font-bold text-text-primary">{fmtMoney(detail.totalCost)}</div>
        </div>
      </div>

      {/* Unit explanation */}
      <div
        className="flex items-start gap-2 px-3 py-2 rounded-xl mb-3 text-xs"
        style={{ background: '#FFF3CC' }}
      >
        <Info className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" style={{ color: C.amberDark }} />
        <span style={{ color: C.amberDark }}>
          Штучный товар: контролируется сверкой проданных штук со списанными, а не нормой отхода
        </span>
      </div>

      {/* Worst location */}
      <div className="flex items-center gap-2 text-xs text-text-muted mb-1 flex-wrap">
        <span>Худшая точка:</span>
        <span className="font-bold" style={{ color: detail.worstDeclared > 30 ? C.red : C.text }}>
          {detail.worstLocationName.replace('Bahandi ', '')}
        </span>
        <span style={{ color: detail.worstDeclared > 30 ? C.red : C.muted }}>
          {detail.worstDeclared}% списаний к продажам
        </span>
        {isSuspect && (
          <span className="badge badge-red text-[10px]">Сарыарка — флаг</span>
        )}
      </div>

      {/* Cost */}
      <div className="mt-3 pt-3 border-t border-stone-100">
        <div className="flex items-center gap-4 flex-wrap">
          <div>
            <div className="text-[10px] text-text-muted uppercase tracking-wide">Списано за период</div>
            <div className="text-sm font-bold text-text-primary">{fmtMoneyFull(detail.totalCost)}</div>
          </div>
          {detail.overNormCost > 0 && (
            <div>
              <div className="text-[10px] uppercase tracking-wide" style={{ color: C.red }}>Аномальные списания</div>
              <div className="text-sm font-bold" style={{ color: C.red }}>{fmtMoneyFull(detail.overNormCost)}</div>
            </div>
          )}
        </div>
      </div>

      {/* Expand toggle */}
      <button
        onClick={() => setExpanded((v) => !v)}
        className="flex items-center gap-1 text-xs font-medium w-full justify-center py-1.5 mt-3 rounded-lg hover:bg-stone-50 transition-colors"
        style={{ color: C.muted }}
      >
        {expanded ? (
          <>
            <ChevronUp className="w-3.5 h-3.5" />
            Скрыть точки
          </>
        ) : (
          <>
            <ChevronDown className="w-3.5 h-3.5" />
            Все точки ({detail.locations.length})
          </>
        )}
      </button>

      {expanded && (
        <div className="mt-2 pt-2 border-t border-stone-100">
          {detail.locations.map((loc) => (
            <LocationRow key={loc.locationName} loc={loc} norm={detail.norm} isUnit />
          ))}
        </div>
      )}
    </div>
  );
}

/* ─────────────────────────── Summary tile ─────────────────────────── */

interface SummaryTileProps {
  label: string;
  value: string;
  sub?: string;
  accent?: string;
}

function SummaryTile({ label, value, sub, accent }: SummaryTileProps) {
  return (
    <div className="card p-4 flex flex-col gap-1">
      <div className="text-xs text-text-muted">{label}</div>
      <div className="text-xl font-black" style={{ color: accent ?? C.text }}>{value}</div>
      {sub && <div className="text-[11px]" style={{ color: C.muted }}>{sub}</div>}
    </div>
  );
}

/* ─────────────────────────── Main view ─────────────────────────── */

export default function ProductsView() {
  const { source, period } = useDashboard();

  const { data: details, loading } = useAsyncData(
    () => source.getProductDetails(period),
    [source, period],
  );
  const { data: waste } = useAsyncData(
    () => source.getProductWaste(period),
    [source, period],
  );

  // Silence unused-var lint by referencing waste in a guard
  void waste;

  if (loading || !details) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-24 text-text-muted">
        <Loader2 className="w-7 h-7 animate-spin" style={{ color: C.amber }} />
        <span className="text-sm">Загрузка…</span>
      </div>
    );
  }

  /* ── Computed summaries ── */
  const totalCost = details.reduce((s, d) => s + d.totalCost, 0);
  const totalOverNorm = details.reduce((s, d) => s + d.overNormCost, 0);
  const overNormProductCount = details.filter((d) =>
    d.locations.some((l) => l.overNorm),
  ).length;

  const weightDetails = details.filter((d) => d.type === 'weight');
  const unitDetails = details.filter((d) => d.type === 'unit');

  return (
    <div className="max-w-7xl mx-auto px-6 py-6">
      {/* ── Page header ── */}
      <div className="mb-6">
        <h2 className="text-xl font-black text-text-primary mb-1">Продукты</h2>
        <p className="text-sm text-text-muted leading-relaxed max-w-2xl">
          Где именно течёт товар. Два контура контроля:{' '}
          <strong className="text-text-primary">весовой</strong>{' '}
          (норма отхода) и{' '}
          <strong className="text-text-primary">штучный</strong>{' '}
          (сверка с продажами).
        </p>
      </div>

      {/* ── Summary tiles ── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <SummaryTile
          label="Списано за период"
          value={fmtMoney(totalCost)}
          sub={`${fmtMoneyFull(totalCost)} всего`}
        />
        <SummaryTile
          label="Сверх нормы (хищение)"
          value={fmtMoney(totalOverNorm)}
          sub="потенциальные потери"
          accent={C.red}
        />
        <SummaryTile
          label="Продуктов с превышением"
          value={String(overNormProductCount)}
          sub={`из ${details.length} продуктов`}
          accent={overNormProductCount > 0 ? C.red : C.green}
        />
      </div>

      {/* ═══════════════════════════════════════════════════════════
          КОНТУР 1: ВЕСОВОЙ
      ═══════════════════════════════════════════════════════════ */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-4">
          <Scale className="w-5 h-5" style={{ color: C.amberDark }} />
          <div>
            <h3 className="text-base font-bold text-text-primary">Контур 1 — весовой</h3>
            <p className="text-xs text-text-muted">
              Помидоры, капуста, соусы и другие ингредиенты. Контроль по норме отхода —
              если заявлено больше нормы, это флаг.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {weightDetails.map((d) => (
            <WeightCard key={d.product} detail={d} />
          ))}
        </div>

        {weightDetails.length === 0 && (
          <div className="text-sm text-text-muted py-8 text-center">Нет данных по весовым продуктам</div>
        )}
      </div>

      {/* ═══════════════════════════════════════════════════════════
          КОНТУР 2: ШТУЧНЫЙ
      ═══════════════════════════════════════════════════════════ */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-4">
          <Package className="w-5 h-5" style={{ color: C.amber }} />
          <div>
            <h3 className="text-base font-bold text-text-primary">Контур 2 — штучный</h3>
            <p className="text-xs text-text-muted">
              Котлеты, булки, упаковки. Штучные товары контролируются сверкой проданных
              штук со списанными, а не нормой отхода.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {unitDetails.map((d) => (
            <UnitCard key={d.product} detail={d} />
          ))}
        </div>

        {unitDetails.length === 0 && (
          <div className="text-sm text-text-muted py-8 text-center">Нет данных по штучным продуктам</div>
        )}
      </div>

      {/* ── Info block ── */}
      <div className="bg-offwhite rounded-2xl px-5 py-4 flex items-start gap-3">
        <Info className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: C.muted }} />
        <div className="text-xs leading-relaxed text-text-muted">
          <strong className="text-text-primary">Почему два контура?</strong>{' '}
          Котлету можно посчитать штуками и сверить с чеками — это точный метод.
          Помидор или соус списывается по весу в ходе приготовления, поэтому здесь работает
          норма отхода: допустимый % потерь при обработке. Если списание превышает норму —
          система поднимает флаг. Сарыарка системно превышает норму по помидору, капусте
          и соусу — это паттерн, характерный для хищения.
        </div>
      </div>
    </div>
  );
}
