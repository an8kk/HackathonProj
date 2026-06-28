import { ArrowRight, Equal, Info } from 'lucide-react';
import { fmtMoney, fmtMoneyFull } from 'shared/qamqor-data/format';
import { C, varianceColor } from 'shared/qamqor-data/colors';
import type { LocationStats } from 'shared/qamqor-data/types';

interface Props {
  locations: LocationStats[];
  onOpenLocation?: (id: string) => void;
}

export default function ReconciliationSection({ locations, onOpenLocation }: Props) {
  if (locations.length === 0) return null;

  const worst = [...locations].sort((a, b) => b.unexplainedDeficit - a.unexplainedDeficit)[0];
  const totalUnexplained = locations.reduce((s, l) => s + l.unexplainedDeficit, 0);
  const totalDeclared = locations.reduce((s, l) => s + l.declaredWriteOffs, 0);
  const totalActual = locations.reduce((s, l) => s + l.actualDeficit, 0);
  const totalTheoretical = locations.reduce((s, l) => s + l.theoreticalLoss, 0);

  return (
    <div className="card p-5">
      {/* Title */}
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="text-sm font-bold text-charcoal">Формула сверки: откуда берётся хищение</h3>
          <p className="text-xs text-muted mt-0.5">
            Сравниваем слова сотрудников с реальными остатками — разница и есть воровство
          </p>
        </div>
        <div className="flex items-center gap-1.5 text-xs text-muted bg-offwhite px-2.5 py-1.5 rounded-lg">
          <Info className="w-3.5 h-3.5" />
          iiko · инвентаризация
        </div>
      </div>

      {/* Formula chain — worst location as example */}
      <div className="mb-4">
        <p className="text-[10px] uppercase tracking-wider text-muted font-bold mb-2">
          Пример: {worst.locationName.replace('Bahandi ', '')}
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <FormulaBlock
            label="Норма отходов"
            value={fmtMoney(worst.theoreticalLoss)}
            sub="по технологии"
            color={C.muted}
            bg="#F6F3EE"
          />
          <ArrowRight className="w-4 h-4 text-muted flex-shrink-0" />
          <FormulaBlock
            label="Задекларировано"
            value={fmtMoney(worst.declaredWriteOffs)}
            sub="заявки от сотрудников"
            color={C.amberDark}
            bg="#FFF8E7"
            warn={worst.declaredWriteOffs > worst.theoreticalLoss * 1.5}
          />
          <ArrowRight className="w-4 h-4 text-muted flex-shrink-0" />
          <FormulaBlock
            label="Факт. недостача"
            value={fmtMoney(worst.actualDeficit)}
            sub="результат инвентаризации"
            color={C.red}
            bg="#FDE8E8"
          />
          <Equal className="w-4 h-4 text-muted flex-shrink-0" />
          <div
            className="rounded-xl px-4 py-2.5 border-2 flex-shrink-0"
            style={{ borderColor: C.red, background: '#FDE8E8' }}
          >
            <div className="text-xl font-black" style={{ color: C.red }}>
              {fmtMoney(worst.unexplainedDeficit)}
            </div>
            <div className="text-[10px] font-bold uppercase tracking-wide" style={{ color: C.red }}>
              = хищение
            </div>
          </div>
        </div>
        {worst.declaredWriteOffs > worst.theoreticalLoss * 1.5 && (
          <p className="text-xs text-orange-700 bg-orange-50 rounded-lg px-3 py-1.5 mt-2 inline-block">
            ⚠ Задекларировано в {(worst.declaredWriteOffs / worst.theoreticalLoss).toFixed(1)}× выше нормы — но это не оправдывает недостачу
          </p>
        )}
      </div>

      {/* Network table */}
      <div className="border-t border-card-border pt-4">
        <p className="text-[10px] uppercase tracking-wider text-muted font-bold mb-2">Сводка по сети</p>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-muted">
                <th className="text-left pb-2 font-medium">Точка</th>
                <th className="text-right pb-2 font-medium">Норма</th>
                <th className="text-right pb-2 font-medium">Заявлено</th>
                <th className="text-right pb-2 font-medium">Факт. недостача</th>
                <th className="text-right pb-2 font-bold">Необъяснённо</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-50">
              {[...locations]
                .sort((a, b) => b.unexplainedDeficit - a.unexplainedDeficit)
                .map((loc) => (
                  <tr
                    key={loc.locationId}
                    onClick={onOpenLocation ? () => onOpenLocation(loc.locationId) : undefined}
                    className={onOpenLocation ? 'cursor-pointer hover:bg-surface transition-colors' : ''}
                  >
                    <td className="py-1.5 font-medium text-charcoal">
                      {loc.locationName.replace('Bahandi ', '')}
                    </td>
                    <td className="py-1.5 text-right text-muted">{fmtMoney(loc.theoreticalLoss)}</td>
                    <td className="py-1.5 text-right" style={{ color: loc.declaredWriteOffs > loc.theoreticalLoss * 2 ? C.amberDark : C.muted }}>
                      {fmtMoney(loc.declaredWriteOffs)}
                    </td>
                    <td className="py-1.5 text-right text-muted">{fmtMoney(loc.actualDeficit)}</td>
                    <td className="py-1.5 text-right font-bold" style={{ color: varianceColor(loc.variancePercent) }}>
                      {loc.unexplainedDeficit > 0 ? fmtMoneyFull(loc.unexplainedDeficit) : '—'}
                    </td>
                  </tr>
                ))}
            </tbody>
            <tfoot className="border-t-2 border-card-border">
              <tr>
                <td className="pt-2 font-bold text-charcoal">Итого по сети</td>
                <td className="pt-2 text-right text-muted font-medium">{fmtMoney(totalTheoretical)}</td>
                <td className="pt-2 text-right text-muted font-medium">{fmtMoney(totalDeclared)}</td>
                <td className="pt-2 text-right text-muted font-medium">{fmtMoney(totalActual)}</td>
                <td className="pt-2 text-right font-black" style={{ color: C.red }}>
                  {fmtMoneyFull(totalUnexplained)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  );
}

function FormulaBlock({
  label, value, sub, color, bg, warn = false,
}: {
  label: string; value: string; sub: string; color: string; bg: string; warn?: boolean;
}) {
  return (
    <div
      className="rounded-xl px-3.5 py-2.5 flex-shrink-0"
      style={{ background: bg, outline: warn ? `2px solid ${C.amber}` : undefined }}
    >
      <div className="text-lg font-black" style={{ color }}>{value}</div>
      <div className="text-[10px] font-semibold text-charcoal mt-0.5">{label}</div>
      <div className="text-[10px] text-muted">{sub}</div>
    </div>
  );
}
