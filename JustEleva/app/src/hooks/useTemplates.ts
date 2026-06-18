import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { EvaluationTemplate } from '../types';

const BASE = '/api/templates';

async function fetchJSON<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, { headers: { 'Content-Type': 'application/json' }, ...init });
  if (!res.ok) throw new Error(await res.text());
  if (res.status === 204) return undefined as T;
  return res.json();
}

// Payload de escrita: blocos/perguntas sem ids (o backend recria por ordem)
export type TemplateInput = {
  name: string;
  description?: string | null;
  applies_to?: 'default' | 'managers';
  is_active?: boolean;
  blocks?: { title: string; manager_only?: boolean; questions?: { text: string; answer_type?: string }[] }[];
};

export function useTemplates() {
  return useQuery<EvaluationTemplate[]>({
    queryKey: ['templates'],
    queryFn: () => fetchJSON(BASE),
  });
}

export function useTemplate(id?: string) {
  return useQuery<EvaluationTemplate>({
    queryKey: ['templates', id],
    queryFn: () => fetchJSON(`${BASE}/${id}`),
    enabled: !!id,
  });
}

export function useCreateTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: TemplateInput) =>
      fetchJSON<EvaluationTemplate>(BASE, { method: 'POST', body: JSON.stringify(data) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['templates'] }),
  });
}

export function useUpdateTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: TemplateInput & { id: string }) =>
      fetchJSON<EvaluationTemplate>(`${BASE}/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ['templates'] });
      qc.invalidateQueries({ queryKey: ['templates', vars.id] });
      qc.invalidateQueries({ queryKey: ['evaluations'] });
    },
  });
}

export function useDeleteTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => fetchJSON<void>(`${BASE}/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['templates'] });
      qc.invalidateQueries({ queryKey: ['employees'] });
    },
  });
}

export function useAssignTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ employee_id, template_id }: { employee_id: string; template_id: string | null }) =>
      fetchJSON(`/api/employees/${employee_id}/template`, { method: 'PUT', body: JSON.stringify({ template_id }) }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['employees'] });
      qc.invalidateQueries({ queryKey: ['evaluations'] });
    },
  });
}
