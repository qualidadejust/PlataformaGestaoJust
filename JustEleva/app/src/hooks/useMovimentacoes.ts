import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { AccessLink } from './useCycles';

export type Movimentacao = {
  id: string;
  employee_id: string;
  employee_name: string;
  employee_role: string;
  tipo: 'aumento' | 'promocao';
  cargo_atual?: string | null;
  cargo_pretendido?: string | null;
  motivo?: string | null;
  status: 'solicitada' | 'em_coleta' | 'concluida' | 'arquivada';
  decisao?: 'aprovada' | 'reprovada' | null;
  justificativa?: string | null;
  decided_at?: string | null;
  banca_total: number;
  banca_concluidas: number;
};

export type BancaMember = {
  evaluation_id: string;
  evaluator_id: string;
  evaluator_name: string | null;
  evaluator_role: string | null;
  status: string;
};

export type MovimentacaoDetalhe = Omit<Movimentacao, 'employee_name' | 'employee_role' | 'banca_total' | 'banca_concluidas'> & {
  employee: { id: string; name: string; role: string };
  banca: BancaMember[];
};

const BASE = '/api/movimentacoes';

async function fetchJSON<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, { headers: { 'Content-Type': 'application/json' }, ...init });
  if (!res.ok) throw new Error(await res.text());
  if (res.status === 204) return undefined as T;
  return res.json();
}

export function useMovimentacoes() {
  return useQuery<Movimentacao[]>({ queryKey: ['movimentacoes'], queryFn: () => fetchJSON(BASE) });
}

export function useMovimentacao(id?: string) {
  return useQuery<MovimentacaoDetalhe>({
    queryKey: ['movimentacoes', id],
    queryFn: () => fetchJSON(`${BASE}/${id}`),
    enabled: !!id,
  });
}

export function useCreateMovimentacao() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { employee_id: string; tipo: 'aumento' | 'promocao'; cargo_pretendido?: string; cargo_atual?: string; motivo?: string }) =>
      fetchJSON<Movimentacao>(BASE, { method: 'POST', body: JSON.stringify(data) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['movimentacoes'] }),
  });
}

export function useUpdateMovimentacao() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: { id: string; status?: string; decisao?: string; justificativa?: string }) =>
      fetchJSON<Movimentacao>(`${BASE}/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    onSuccess: (_d, v) => {
      qc.invalidateQueries({ queryKey: ['movimentacoes'] });
      qc.invalidateQueries({ queryKey: ['movimentacoes', v.id] });
    },
  });
}

export function useDeleteMovimentacao() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => fetchJSON<void>(`${BASE}/${id}`, { method: 'DELETE' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['movimentacoes'] }),
  });
}

export function useAddBanca(movId?: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (evaluator_id: string) =>
      fetchJSON(`${BASE}/${movId}/banca`, { method: 'POST', body: JSON.stringify({ evaluator_id }) }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['movimentacoes'] });
      qc.invalidateQueries({ queryKey: ['movimentacoes', movId] });
    },
  });
}

export function useRemoveBanca(movId?: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (evaluationId: string) =>
      fetchJSON<void>(`${BASE}/${movId}/banca/${evaluationId}`, { method: 'DELETE' }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['movimentacoes'] });
      qc.invalidateQueries({ queryKey: ['movimentacoes', movId] });
    },
  });
}

export function useMovimentacaoTokens() {
  return useMutation({
    mutationFn: (id: string) =>
      fetchJSON<AccessLink[]>(`${BASE}/${id}/access-tokens`, { method: 'POST' }),
  });
}
