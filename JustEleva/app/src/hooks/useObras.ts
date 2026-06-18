import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

export type PapelObra = 'residente' | 'mestre' | 'mao_de_obra' | 'administrativo';

export type Obra = {
  id: string;
  nome: string;
  cost_center?: string | null;
  tipo: 'obra' | 'sede';
  status: 'ativa' | 'encerrada';
  total_alocados?: number;
  by_papel?: Record<string, number>;
};

export type Alocacao = {
  id: string;
  employee_id: string;
  obra_id: string;
  papel_na_obra: PapelObra;
  principal: boolean;
  responsavel: boolean;
  data_inicio?: string | null;
  data_fim?: string | null;
  employee?: { id: string; name: string; role: string; department: string };
};

export type ObraDetalhe = Obra & { alocacoes: Alocacao[] };

const BASE = '/api/obras';

async function fetchJSON<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, { headers: { 'Content-Type': 'application/json' }, ...init });
  if (!res.ok) throw new Error(await res.text());
  if (res.status === 204) return undefined as T;
  return res.json();
}

export function useObras() {
  return useQuery<Obra[]>({ queryKey: ['obras'], queryFn: () => fetchJSON(BASE) });
}

export function useObra(id?: string) {
  return useQuery<ObraDetalhe>({
    queryKey: ['obras', id],
    queryFn: () => fetchJSON(`${BASE}/${id}`),
    enabled: !!id,
  });
}

export function useCreateObra() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Pick<Obra, 'nome'> & Partial<Pick<Obra, 'cost_center' | 'tipo' | 'status'>>) =>
      fetchJSON<Obra>(BASE, { method: 'POST', body: JSON.stringify(data) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['obras'] }),
  });
}

export function useUpdateObra() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: Partial<Obra> & { id: string }) =>
      fetchJSON<Obra>(`${BASE}/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    onSuccess: (_d, v) => {
      qc.invalidateQueries({ queryKey: ['obras'] });
      qc.invalidateQueries({ queryKey: ['obras', v.id] });
    },
  });
}

export function useDeleteObra() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => fetchJSON<void>(`${BASE}/${id}`, { method: 'DELETE' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['obras'] }),
  });
}

export function useCreateAlocacao(obraId?: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { employee_id: string; papel_na_obra: PapelObra; principal?: boolean; data_inicio?: string | null }) =>
      fetchJSON<Alocacao>(`${BASE}/${obraId}/alocacoes`, { method: 'POST', body: JSON.stringify(data) }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['obras'] });
      qc.invalidateQueries({ queryKey: ['obras', obraId] });
    },
  });
}

export function useUpdateAlocacao(obraId?: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: { id: string } & Partial<Pick<Alocacao, 'papel_na_obra' | 'principal' | 'responsavel' | 'data_inicio' | 'data_fim'>>) =>
      fetchJSON<Alocacao>(`/api/alocacoes/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['obras'] });
      qc.invalidateQueries({ queryKey: ['obras', obraId] });
    },
  });
}

export function useDeleteAlocacao(obraId?: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => fetchJSON<void>(`/api/alocacoes/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['obras'] });
      qc.invalidateQueries({ queryKey: ['obras', obraId] });
    },
  });
}
