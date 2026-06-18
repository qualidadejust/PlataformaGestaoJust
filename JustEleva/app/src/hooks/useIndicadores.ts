import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

export type Indicador = {
  id: string;
  nome: string;
  descricao?: string | null;
  unidade?: string | null;
  direcao: 'maior' | 'menor';
  cargo_alvo?: string | null;
  setor?: string | null;
  formula?: string | null;
  meta?: string | null;
  periodicidade?: string | null;
  responsavel?: string | null;
  acumula?: boolean;
  ativo: boolean;
  atribuicoes_count?: number;
};

export type Atribuicao = {
  id: string;
  indicador_id: string;
  employee_id: string;
  meta?: string | null;
  peso: number;
  fonte: 'avaliador' | 'rh';
  indicador?: Indicador;
  employee?: { id: string; name: string; role: string };
};

export type Realizacao = {
  id: string;
  indicador_id: string;
  employee_id?: string | null;
  periodo: string;
  valor?: string | null;
  valor_num?: number | null;
  observacao?: string | null;
  evidencia_url?: string | null;
  lancado_por?: string | null;
  employee?: { id: string; name: string; role: string } | null;
};

const BASE = '/api/indicadores';

async function fetchJSON<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, { headers: { 'Content-Type': 'application/json' }, ...init });
  if (!res.ok) throw new Error(await res.text());
  if (res.status === 204) return undefined as T;
  return res.json();
}

export function useIndicadores() {
  return useQuery<Indicador[]>({ queryKey: ['indicadores'], queryFn: () => fetchJSON(BASE) });
}

export function useCreateIndicador() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<Indicador> & { nome: string }) =>
      fetchJSON<Indicador>(BASE, { method: 'POST', body: JSON.stringify(data) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['indicadores'] }),
  });
}

export function useUpdateIndicador() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: Partial<Indicador> & { id: string }) =>
      fetchJSON<Indicador>(`${BASE}/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['indicadores'] }),
  });
}

export function useDeleteIndicador() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => fetchJSON<void>(`${BASE}/${id}`, { method: 'DELETE' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['indicadores'] }),
  });
}

export function useAtribuicoes(employeeId?: string) {
  return useQuery<Atribuicao[]>({
    queryKey: ['atribuicoes', employeeId],
    queryFn: () => fetchJSON(`${BASE}/atribuicoes?employee_id=${employeeId}`),
    enabled: !!employeeId,
  });
}

export function useCreateAtribuicao(employeeId?: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { indicador_id: string; employee_id: string; meta?: string; peso?: number; fonte?: string }) =>
      fetchJSON<Atribuicao>(`${BASE}/atribuicoes`, { method: 'POST', body: JSON.stringify(data) }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['atribuicoes', employeeId] });
      qc.invalidateQueries({ queryKey: ['indicadores'] });
    },
  });
}

export function useUpdateAtribuicao(employeeId?: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: { id: string; meta?: string; peso?: number; fonte?: string }) =>
      fetchJSON<Atribuicao>(`${BASE}/atribuicoes/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['atribuicoes', employeeId] }),
  });
}

export function useDeleteAtribuicao(employeeId?: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => fetchJSON<void>(`${BASE}/atribuicoes/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['atribuicoes', employeeId] });
      qc.invalidateQueries({ queryKey: ['indicadores'] });
    },
  });
}

// ---------- Realizações ----------

export function useRealizacoes(periodo?: string) {
  return useQuery<Realizacao[]>({
    queryKey: ['realizacoes', periodo ?? 'all'],
    queryFn: () => fetchJSON(`${BASE}/realizacoes${periodo ? `?periodo=${periodo}` : ''}`),
  });
}

export function useUpsertRealizacao() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { indicador_id: string; periodo: string; employee_id?: string | null; valor?: string; valor_num?: number | null; observacao?: string; lancado_por?: string }) =>
      fetchJSON<Realizacao>(`${BASE}/realizacoes`, { method: 'POST', body: JSON.stringify(data) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['realizacoes'] }),
  });
}

export function useDeleteRealizacao() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => fetchJSON<void>(`${BASE}/realizacoes/${id}`, { method: 'DELETE' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['realizacoes'] }),
  });
}
