import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

export type PdiAction = {
  id: string;
  pdi_plan_id: string;
  title: string;
  description: string;
  status: 'pending' | 'in_progress' | 'completed';
  deadline: string;
  resources_needed?: string;
  expected_outcomes?: string;
  related_competency?: string;
  action_type?: string;
};

export type PdiPlan = {
  id: string;
  employee_id: string;
  employee_name: string;
  employee_role: string;
  cycle_id: string;
  cycle_name: string;
  actions: PdiAction[];
};

const BASE = '/api/pdi';

async function fetchJSON<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, { headers: { 'Content-Type': 'application/json' }, ...init });
  if (!res.ok) throw new Error(await res.text());
  if (res.status === 204) return undefined as T;
  return res.json();
}

export function usePdiPlans(params?: { employee_id?: string }) {
  const qs = params?.employee_id ? `?employee_id=${params.employee_id}` : '';
  return useQuery<PdiPlan[]>({
    queryKey: ['pdi', params],
    queryFn: () => fetchJSON(`${BASE}${qs}`),
  });
}

export function usePdiPlan(id?: string) {
  return useQuery<PdiPlan>({
    queryKey: ['pdi', id],
    queryFn: () => fetchJSON(`${BASE}/${id}`),
    enabled: !!id,
  });
}

export function useCreatePdiPlan() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { employee_id: string; cycle_id: string; actions?: Partial<PdiAction>[] }) =>
      fetchJSON<PdiPlan>(BASE, { method: 'POST', body: JSON.stringify(data) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['pdi'] }),
  });
}

export function useAddPdiAction() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ planId, ...data }: Partial<PdiAction> & { planId: string }) =>
      fetchJSON<PdiAction>(`${BASE}/${planId}/actions`, { method: 'POST', body: JSON.stringify(data) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['pdi'] }),
  });
}

export function useUpdatePdiAction() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ planId, actionId, ...data }: PdiAction & { planId: string; actionId: string }) =>
      fetchJSON<PdiAction>(`${BASE}/${planId}/actions/${actionId}`, { method: 'PUT', body: JSON.stringify(data) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['pdi'] }),
  });
}

export function useDeletePdiPlan() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => fetchJSON<void>(`${BASE}/${id}`, { method: 'DELETE' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['pdi'] }),
  });
}
