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
  tipo_controle: string; // prazo | inspecao | uso_unico
  inspecionavel: boolean;
  validade_dias: number | null;
  alerta_dias: number | null;
  cod_sienge: string | null;
}

export type MotivoEntrega = "inicial" | "complementar" | "troca";

export const TIPO_CONTROLE_LABEL: Record<string, string> = {
  prazo: "Troca por prazo",
  inspecao: "Inspeção periódica",
  uso_unico: "Uso único",
};

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
  motivo: string | null;
  entregue_em: string;
  assinatura_img: string | null;
  assinatura_tipo: string | null;
  observacao: string | null;
  ficha_id: number | null;
  bio_enrolled: number | null;
  bio_match: number | null;
  bio_score: number | null;
  hash: string | null;
  hash_anterior: string | null;
}

// Texto/estado do selo de verificação biométrica de uma entrega.
export function biometriaSelo(e: { bio_enrolled: number | null; bio_match: number | null; bio_score: number | null }): {
  estado: "confirmada" | "nao_cadastrado" | "indisponivel";
  label: string;
  score: number | null;
} {
  if (e.bio_enrolled == null) return { estado: "indisponivel", label: "Não verificada", score: null };
  if (e.bio_enrolled === 0) return { estado: "nao_cadastrado", label: "Sem cadastro biométrico", score: null };
  if (e.bio_match === 1)
    return { estado: "confirmada", label: "Identidade confirmada", score: e.bio_score };
  return { estado: "indisponivel", label: "Não conferida", score: e.bio_score };
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
  motivo: MotivoEntrega;
  // snapshot do controle no momento da entrega (define a ficha)
  tipo_controle: string;
  validade_dias: number | null;
  alerta_dias: number | null;
  assinatura_img: string;
  assinatura_tipo: string;
  observacao?: string;
}

export interface StatusCalc {
  codigo: string; // em_dia | vencimento_proximo | troca_imediata | inspecao_proxima | inspecionar | baixada | consumida
  label: string;
  dias_restantes: number | null;
}

export interface Ficha {
  id: number;
  colaborador_id: string | null;
  colaborador_nome: string;
  colaborador_cargo: string | null;
  empresa_nome: string | null;
  epi_id: string | null;
  epi_nome: string;
  epi_ca: string | null;
  tipo_controle: string;
  validade_dias: number | null;
  alerta_dias: number | null;
  origem: MotivoEntrega;
  entrega_id: number | null;
  entregue_em: string;
  vence_em: string | null;
  proxima_inspecao_em: string | null;
  status: string; // ativa | baixada | consumida
  baixa_motivo: string | null;
  baixa_em: string | null;
  baixa_obs: string | null;
  substitui_ficha_id: number | null;
  status_calc: StatusCalc;
}

export interface Inspecao {
  id: number;
  ficha_id: number;
  data: string;
  resultado: string;
  proxima_inspecao_em: string | null;
  inspetor: string | null;
  inspetor_id: string | null;
  assinatura_img: string | null;
  assinatura_tipo: string | null;
  observacao: string | null;
}

export interface FichaDetalhe extends Ficha {
  inspecoes: Inspecao[];
  entrega: Entrega | null;
}

export interface FichaResumo {
  total_ativas: number;
  por_status: Record<string, number>;
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

export interface Empresa {
  id: string;
  razao_social: string;
  nome_fantasia: string | null;
  cnpj: string | null;
}

export function useEmpresas() {
  return useQuery({
    queryKey: ["core", "empresas"],
    queryFn: () => api.get<Empresa[]>("/core/api/empresas"),
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
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["entregas"] });
      qc.invalidateQueries({ queryKey: ["fichas"] });
    },
  });
}

// ---- Fichas (ciclo de vida do EPI) ----
export function useFichas(filtros?: { status?: string; colaborador_id?: string; q?: string }) {
  const qs = new URLSearchParams();
  if (filtros?.status) qs.set("status", filtros.status);
  if (filtros?.colaborador_id) qs.set("colaborador_id", filtros.colaborador_id);
  if (filtros?.q) qs.set("q", filtros.q);
  const suffix = qs.toString() ? `?${qs}` : "";
  return useQuery({
    queryKey: ["fichas", filtros ?? {}],
    queryFn: () => api.get<Ficha[]>(`/api/fichas${suffix}`),
  });
}

export function useFichaResumo() {
  return useQuery({ queryKey: ["fichas", "resumo"], queryFn: () => api.get<FichaResumo>("/api/fichas/resumo") });
}

export function useFicha(id: number | null) {
  return useQuery({
    queryKey: ["fichas", id],
    queryFn: () => api.get<FichaDetalhe>(`/api/fichas/${id}`),
    enabled: id != null,
  });
}

export interface NovaInspecao {
  resultado: string;
  proxima_inspecao_em?: string | null;
  inspetor?: string;
  inspetor_id?: string | null;
  assinatura_img: string;
  assinatura_tipo: string;
  observacao?: string;
}

export function useCreateInspecao(fichaId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: NovaInspecao) => api.post<Ficha>(`/api/fichas/${fichaId}/inspecoes`, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["fichas"] }),
  });
}

export function useBaixarFicha(fichaId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: { motivo: string; observacao?: string }) =>
      api.post<Ficha>(`/api/fichas/${fichaId}/baixa`, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["fichas"] }),
  });
}
