import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

export type Cycle = {
  id: string;
  name: string;
  start_date: string;
  end_date: string;
  status: 'active' | 'closed' | 'draft';
  tipo?: 'periodica' | 'movimentacao';
};

export type GenerateResult = { criadas: number; ja_existiam: number; avisos: string[] };

export type AccessLink = {
  evaluator_id: string;
  evaluator_name: string;
  evaluator_role: string;
  phone: string | null;
  token: string;
  total: number;
  pendentes: number;
};

const BASE = '/api/cycles';

async function fetchJSON<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, { headers: { 'Content-Type': 'application/json' }, ...init });
  if (!res.ok) throw new Error(await res.text());
  if (res.status === 204) return undefined as T;
  return res.json();
}

export function useCycles() {
  return useQuery<Cycle[]>({
    queryKey: ['cycles'],
    queryFn: () => fetchJSON(BASE),
  });
}

export function useCreateCycle() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Omit<Cycle, 'id'>) =>
      fetchJSON<Cycle>(BASE, { method: 'POST', body: JSON.stringify(data) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['cycles'] }),
  });
}

export function useUpdateCycle() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: Cycle) =>
      fetchJSON<Cycle>(`${BASE}/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['cycles'] }),
  });
}

export function useGenerateCycle() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      fetchJSON<GenerateResult>(`${BASE}/${id}/generate`, { method: 'POST' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['evaluations'] }),
  });
}

export function useCycleAccessTokens() {
  return useMutation({
    mutationFn: (id: string) =>
      fetchJSON<AccessLink[]>(`${BASE}/${id}/access-tokens`, { method: 'POST' }),
  });
}

export function useDeleteCycle() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => fetchJSON<void>(`${BASE}/${id}`, { method: 'DELETE' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['cycles'] }),
  });
}
