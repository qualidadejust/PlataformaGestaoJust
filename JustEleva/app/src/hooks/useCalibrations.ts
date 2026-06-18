import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

export type CalibrationEntry = {
  id: string;
  employee_id: string;
  cycle_id: string;
  score: number | null;
  potential: string | null;
  justification: string | null;
  status: string;
};

const BASE = '/api/calibrations';

async function fetchJSON<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, { headers: { 'Content-Type': 'application/json' }, ...init });
  if (!res.ok) throw new Error(await res.text());
  if (res.status === 204) return undefined as T;
  return res.json();
}

export function useCalibrations(cycleId?: string) {
  const qs = cycleId ? `?cycle_id=${cycleId}` : '';
  return useQuery<CalibrationEntry[]>({
    queryKey: ['calibrations', cycleId],
    queryFn: () => fetchJSON(`${BASE}${qs}`),
    enabled: !!cycleId,
  });
}

export function useSaveCalibrations() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      cycleId,
      entries,
      status,
    }: {
      cycleId: string;
      entries: Array<{ employee_id: string; score?: number | null; potential?: string | null; justification?: string | null }>;
      status?: 'draft' | 'finalized';
    }) =>
      fetchJSON<{ ok: boolean }>(`${BASE}/${cycleId}`, {
        method: 'PUT',
        body: JSON.stringify({ entries, status }),
      }),
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ['calibrations', vars.cycleId] });
    },
  });
}
