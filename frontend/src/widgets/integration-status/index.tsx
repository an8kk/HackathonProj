import { Activity, CheckCircle2, XCircle, Plug } from 'lucide-react';
import { ApiError } from 'shared/api/client';
import { useAnalyticsSummary, useIikoStatus } from 'shared/api/queries';

function Flag({ ok, label }: { ok: boolean; label: string }) {
  return (
    <span
      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold"
      style={{ background: ok ? '#E8F5E9' : '#FDE8E8', color: ok ? '#2E7D32' : '#D62828' }}
    >
      {ok ? <CheckCircle2 className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
      {label}
    </span>
  );
}

export default function IntegrationStatus() {
  const iikoQuery = useIikoStatus();
  const summaryQuery = useAnalyticsSummary();

  const error = iikoQuery.error ?? summaryQuery.error;
  if (error) {
    const code = error instanceof ApiError ? error.code : 'network_error';
    return (
      <div className="card p-4 text-sm text-theft">Интеграции недоступны: {code}</div>
    );
  }

  const iiko = iikoQuery.data;
  const summary = summaryQuery.data;
  if (!iiko || !summary) {
    return <div className="card p-4 text-sm text-text-muted">Загрузка интеграций…</div>;
  }

  const summaryStats = [
    { label: 'Всего', value: summary.total_requests },
    { label: 'На проверке', value: summary.pending },
    { label: 'Одобрено', value: summary.approved },
    { label: 'Отклонено', value: summary.rejected },
  ];

  return (
    <div className="card p-4">
      <div className="flex items-center gap-2 mb-3">
        <Plug className="w-4 h-4 text-amber-DEFAULT" />
        <p className="text-sm font-bold text-text-primary">Интеграции iiko</p>
      </div>

      <div className="rounded-xl p-3 bg-offwhite">
        <p className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-1.5">
          {iiko.provider}
        </p>
        <p className="text-xs text-text-muted mb-2">{iiko.purpose}</p>
        <div className="flex flex-wrap gap-1.5">
          <Flag ok={iiko.configured} label={iiko.configured ? 'настроено' : 'не настроено'} />
          <Flag ok={iiko.write_off_act_endpoint_available} label="акт списания" />
        </div>
        <p className="text-xs text-text-muted mt-2 font-mono break-all">
          {iiko.write_off_act_endpoint}
        </p>
      </div>

      <div className="flex items-center gap-2 mt-4 mb-2">
        <Activity className="w-4 h-4 text-amber-DEFAULT" />
        <p className="text-sm font-bold text-text-primary">Сводка по заявкам</p>
      </div>
      <div className="grid grid-cols-4 gap-2">
        {summaryStats.map(s => (
          <div key={s.label} className="text-center rounded-xl p-2 bg-offwhite">
            <div className="text-xl font-black text-text-primary">{s.value}</div>
            <div className="text-xs text-text-muted mt-0.5">{s.label}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
