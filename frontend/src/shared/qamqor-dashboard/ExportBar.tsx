import { Download, Printer } from 'lucide-react';
import { requestsToCsv, locationsToCsv, downloadCsv } from 'shared/qamqor-data/csv';
import type { WriteOffRequest, LocationStats, Period } from 'shared/qamqor-data/types';
import { PERIOD_LABELS } from 'shared/qamqor-data/types';

export default function ExportBar({
  requests,
  locations,
  period,
}: {
  requests: WriteOffRequest[];
  locations: LocationStats[];
  period: Period;
}) {
  const tag = PERIOD_LABELS[period].toLowerCase();

  return (
    <div className="flex items-center gap-2 no-print">
      <button
        onClick={() => downloadCsv(`qamqor-точки-${tag}.csv`, locationsToCsv(locations))}
        className="btn-secondary py-2 text-sm"
        title="Скачать сводку по точкам в CSV"
      >
        <Download className="w-4 h-4" />
        Точки CSV
      </button>
      <button
        onClick={() => downloadCsv(`qamqor-заявки-${tag}.csv`, requestsToCsv(requests))}
        className="btn-secondary py-2 text-sm"
        title="Скачать список заявок в CSV"
      >
        <Download className="w-4 h-4" />
        Заявки CSV
      </button>
      <button onClick={() => window.print()} className="btn-secondary py-2 text-sm" title="Печать / сохранить в PDF">
        <Printer className="w-4 h-4" />
        Печать
      </button>
    </div>
  );
}
