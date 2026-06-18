import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

export type Feedback = {
  id: string;
  from_employee_id: string;
  from_name: string;
  from_role: string;
  to_employee_id: string;
  to_name: string;
  to_role: string;
  evaluation_id?: string;
  content: string;
  type: 'positive' | 'improvement' | 'recognition';
  created_at: string;
};

const BASE = '/api/feedback';

async function fetchJSON<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, { headers: { 'Content-Type': 'application/json' }, ...init });
  if (!res.ok) throw new Error(await res.text());
  if (res.status === 204) return undefined as T;
  return res.json();
}

export function useFeedbacks(params?: { to_employee_id?: string; from_employee_id?: string }) {
  const qs = new URLSearchParams();
  if (params?.to_employee_id)   qs.set('to_employee_id', params.to_employee_id);
  if (params?.from_employee_id) qs.set('from_employee_id', params.from_employee_id);
  const query = qs.toString() ? `?${qs}` : '';

  return useQuery<Feedback[]>({
    queryKey: ['feedback', params],
    queryFn: () => fetchJSON(`${BASE}${query}`),
  });
}

export function useCreateFeedback() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Pick<Feedback, 'from_employee_id' | 'to_employee_id' | 'content' | 'type'> & { evaluation_id?: string }) =>
      fetchJSON<Feedback>(BASE, { method: 'POST', body: JSON.stringify(data) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['feedback'] }),
  });
}

export function useDeleteFeedback() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => fetchJSON<void>(`${BASE}/${id}`, { method: 'DELETE' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['feedback'] }),
  });
}
