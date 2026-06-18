import { useQuery } from '@tanstack/react-query';

export type PortalEval = {
  id: string;
  employee_name: string;
  employee_role: string;
  obra_nome: string | null;
  status: string;
};

export type PortalData = {
  evaluator: { id: string; name: string; role: string } | null;
  titulo: string;
  evaluations: PortalEval[];
};

async function fetchJSON<T>(url: string): Promise<T> {
  const res = await fetch(url, { headers: { 'Content-Type': 'application/json' } });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export function usePortal(token?: string) {
  return useQuery<PortalData>({
    queryKey: ['portal', token],
    queryFn: () => fetchJSON(`/api/portal/${token}`),
    enabled: !!token,
    retry: false,
  });
}
