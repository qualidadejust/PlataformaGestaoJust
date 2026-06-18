import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { EvaluationTemplate } from '../types';

export type Evaluation = {
  id: string;
  employee_id: string;
  employee_name: string;
  employee_role: string;
  evaluator_id?: string;
  evaluator_name?: string;
  cycle_id?: string;
  cycle_name?: string;
  obra_id?: string | null;
  obra_nome?: string | null;
  type: string;
  status: string;
  due_date?: string;
  submitted_at?: string;
  strengths?: string;
  opportunities?: string;
  avg_score?: number | null;
  avg_potential?: number | null;
  employee_department?: string;
  scores?: { question_id: string; score: string }[];
  potential_scores?: { question_id: string; score: number }[];
  is_manager?: number;
  template?: EvaluationTemplate | null;
};

const BASE = '/api/evaluations';

async function fetchJSON<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, { headers: { 'Content-Type': 'application/json' }, ...init });
  if (!res.ok) throw new Error(await res.text());
  if (res.status === 204) return undefined as T;
  return res.json();
}

export function useEvaluations(params?: { cycle_id?: string; employee_id?: string; status?: string; obra_id?: string }) {
  const qs = new URLSearchParams();
  if (params?.cycle_id)    qs.set('cycle_id', params.cycle_id);
  if (params?.employee_id) qs.set('employee_id', params.employee_id);
  if (params?.status)      qs.set('status', params.status);
  if (params?.obra_id)     qs.set('obra_id', params.obra_id);
  const query = qs.toString() ? `?${qs}` : '';

  return useQuery<Evaluation[]>({
    queryKey: ['evaluations', params],
    queryFn: () => fetchJSON(`${BASE}${query}`),
  });
}

export function useEvaluation(id?: string) {
  return useQuery<Evaluation>({
    queryKey: ['evaluations', id],
    queryFn: () => fetchJSON(`${BASE}/${id}`),
    enabled: !!id,
  });
}

export function useCreateEvaluation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Pick<Evaluation, 'employee_id' | 'type'> & Partial<Evaluation>) =>
      fetchJSON<Evaluation>(BASE, { method: 'POST', body: JSON.stringify(data) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['evaluations'] }),
  });
}

export function useSaveScores() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, scores, potential_scores, status, strengths, opportunities, feedback_date }: {
      id: string;
      scores?: Record<string, string | number | null>;
      potential_scores?: Record<string, number | null>;
      status?: string;
      strengths?: string;
      opportunities?: string;
      feedback_date?: string;
    }) => fetchJSON<{ ok: boolean }>(`${BASE}/${id}/scores`, { method: 'PUT', body: JSON.stringify({ scores, potential_scores, status, strengths, opportunities, feedback_date }) }),
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ['evaluations', vars.id] });
      qc.invalidateQueries({ queryKey: ['evaluations'] });
    },
  });
}

export function useDeleteEvaluation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => fetchJSON<void>(`${BASE}/${id}`, { method: 'DELETE' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['evaluations'] }),
  });
}
