import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

export type Employee = {
  id: string;
  name: string;
  role: string;
  department: string;
  email?: string;
  phone?: string;
  admission_date?: string;
  avatar_url?: string;
  is_manager: number;
  cost_center?: string | null;
  template_id?: string | null;
};

const BASE = '/api/employees';

async function fetchJSON<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, { headers: { 'Content-Type': 'application/json' }, ...init });
  if (!res.ok) throw new Error(await res.text());
  if (res.status === 204) return undefined as T;
  return res.json();
}

export function useEmployees() {
  return useQuery<Employee[]>({
    queryKey: ['employees'],
    queryFn: () => fetchJSON(BASE),
  });
}

export function useEmployee(id?: string) {
  return useQuery<Employee>({
    queryKey: ['employees', id],
    queryFn: () => fetchJSON(`${BASE}/${id}`),
    enabled: !!id,
  });
}

export type PerformancePoint = {
  cycle_id: string; cycle_name: string; evaluation_id: string;
  type: string; avg_score: number | null; avg_potential: number | null;
};

export function useEmployeePerformance(id?: string) {
  return useQuery<PerformancePoint[]>({
    queryKey: ['employees', id, 'performance'],
    queryFn: () => fetchJSON(`${BASE}/${id}/performance`),
    enabled: !!id,
  });
}

export function useCreateEmployee() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Omit<Employee, 'id'>) =>
      fetchJSON<Employee>(BASE, { method: 'POST', body: JSON.stringify(data) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['employees'] }),
  });
}

export function useUpdateEmployee() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: Partial<Employee> & { id: string }) =>
      fetchJSON<Employee>(`${BASE}/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['employees'] }),
  });
}

export function useDeleteEmployee() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => fetchJSON<void>(`${BASE}/${id}`, { method: 'DELETE' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['employees'] }),
  });
}
