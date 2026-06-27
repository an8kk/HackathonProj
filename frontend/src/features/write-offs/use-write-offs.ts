import { useEffect, useState } from 'react';
import type { WriteOff, WriteOffStatus } from 'entities/write-off';
import { buildApiUrl } from 'shared/api/http-client';

type State =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'done'; data: WriteOff[] };

export function useWriteOffs(filters?: { status?: WriteOffStatus; outletName?: string }) {
  const [state, setState] = useState<State>({ status: 'loading' });

  useEffect(() => {
    const controller = new AbortController();
    setState({ status: 'loading' });

    const params = new URLSearchParams();
    if (filters?.status) params.set('status', filters.status);
    if (filters?.outletName) params.set('outletName', filters.outletName);

    const url = buildApiUrl(`/write-offs${params.size ? `?${params}` : ''}`);

    fetch(url, { signal: controller.signal })
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json() as Promise<{ data: WriteOff[] }>;
      })
      .then(({ data }) => setState({ status: 'done', data }))
      .catch((err: unknown) => {
        if (err instanceof Error && err.name === 'AbortError') return;
        setState({ status: 'error', message: 'Не удалось загрузить заявки' });
      });

    return () => controller.abort();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters?.status, filters?.outletName]);

  const review = async (id: string, decision: { status: 'approved' | 'rejected'; rejectionReason?: string }) => {
    const res = await fetch(buildApiUrl(`/write-offs/${id}/review`), {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(decision),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const { data } = (await res.json()) as { data: WriteOff };

    setState((prev) =>
      prev.status === 'done'
        ? { status: 'done', data: prev.data.map((w) => (w.id === id ? data : w)) }
        : prev,
    );
  };

  return { state, review };
}
