import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../lib/utils";

// ---- Dados-mestre do Core (via proxy /core) ----
export interface Colaborador {
  id: string;
  nome: string;
  matricula: string | null;
  cargo: { nome: string } | null;
  empresa: { nome_fantasia: string | null; razao_social: string } | null;
  setor: string | null;
  status: string;
}

export interface Epi {
  id: string;
  nome: string;
  ca: string | null;
  categoria: string;
  validade_dias: number | null;
}

// ---- Entrega (local, com snapshot do Core) ----
export interface Entrega {
  id: number;
  colaborador_id: string | null;
  colaborador_nome: string;
  colaborador_matricula: string | null;
  colaborador_cargo: string | null;
  empresa_nome: string | null;
  epi_id: string | null;
  epi_nome: string;
  epi_ca: string | null;
  quantidade: number;
  entregue_em: string;
  assinatura_img: string | null;
  assinatura_tipo: string | null;
  observacao: string | null;
  hash: string | null;
  hash_anterior: string | null;
}

export interface NovaEntrega {
  colaborador_id: string;
  colaborador_nome: string;
  colaborador_matricula: string | null;
  colaborador_cargo: string | null;
  empresa_nome: string | null;
  epi_id: string;
  epi_nome: string;
  epi_ca: string | null;
  quantidade: number;
  assinatura_img: string;
  assinatura_tipo: string;
  observacao?: string;
}

export interface Verificacao {
  ok: boolean;
  total: number;
  quebras: number[];
}

export function useColaboradores() {
  return useQuery({
    queryKey: ["core", "colaboradores"],
    queryFn: () => api.get<Colaborador[]>("/core/api/colaboradores"),
  });
}

// EPIs = insumos do Core com categoria 'epi'
export function useEpis() {
  return useQuery({
    queryKey: ["core", "insumos"],
    queryFn: async () => {
      const insumos = await api.get<Epi[]>("/core/api/insumos");
      return insumos.filter((i) => i.categoria === "epi");
    },
  });
}

export function useEntregas() {
  return useQuery({ queryKey: ["entregas"], queryFn: () => api.get<Entrega[]>("/api/entregas") });
}

export function useVerificacao() {
  return useQuery({
    queryKey: ["entregas", "verificacao"],
    queryFn: () => api.get<Verificacao>("/api/entregas/verificacao"),
  });
}

export function useCreateEntrega() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: NovaEntrega) => api.post<Entrega>("/api/entregas", body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["entregas"] }),
  });
}
