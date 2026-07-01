// Helpers de acesso a dados. As chamadas passam pelo interceptor de `api-base.ts`
// (injeta Authorization e, em produção, o prefixo do gateway).
//   /api/...        -> backend do próprio JustVistoria (4800)
//   /core/api/...   -> JustCore (4100): cadastros (unidades/clientes/obras) e GED

async function req<T>(url: string, init?: RequestInit): Promise<T> {
  const r = await fetch(url, init);
  if (!r.ok) throw new Error((await r.json().catch(() => ({}))).error || `HTTP ${r.status}`);
  if (r.status === 204) return undefined as T;
  return (await r.json()) as T;
}

export const api = {
  get: <T>(p: string) => req<T>(p),
  post: <T>(p: string, body: unknown) => req<T>(p, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }),
  put: <T>(p: string, body: unknown) => req<T>(p, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }),
  del: (p: string) => req<void>(p, { method: "DELETE" }),
  /** POST multipart (FormData) — para o termo (PDF + campos). */
  postForm: <T>(p: string, fd: FormData) => req<T>(p, { method: "POST", body: fd }),
};

// ---- Tipos compartilhados ----
export interface Unidade {
  id: string;
  identificador: string;
  categoria: string;
  bloco?: string | null;
  pavimento?: string | null;
  codigo?: string | null;
  obra_id: string;
  cliente_id?: string | null;
  obra?: { nome?: string };
  cliente?: { id: string; nome: string; cpf?: string | null } | null;
}

export interface Etapa {
  id: string;
  unidade_id: string;
  unidade_label: string;
  tipo: "construcao" | "inspecao_final" | "vistoria_cliente" | "entrega_chaves";
  situacao: "nao_iniciada" | "em_andamento" | "concluida" | "desconsiderada";
  previsto_de?: string | null;
  previsto_ate?: string | null;
  realizado_de?: string | null;
  realizado_ate?: string | null;
  observacao?: string | null;
  itens: ItemEtapa[];
}

export interface ItemEtapa {
  id: string;
  etapa_id: string;
  situacao: "agendada" | "reprovada" | "aprovada" | "nao_realizado";
  responsavel_nome?: string | null;
  cliente_nome?: string | null;
  previsto_de?: string | null;
  previsto_ate?: string | null;
  realizado_de?: string | null;
  instancia_id?: string | null;
}

export interface NaoConformidade {
  id: string;
  unidade_id: string;
  unidade_label?: string;
  titulo: string;
  descricao?: string | null;
  severidade: "baixa" | "media" | "alta" | "critica";
  status: "aberta" | "em_correcao" | "reverificar" | "corrigida" | "aceita";
  origem?: "construcao" | "inspecao_final" | "vistoria_cliente" | "manual";
  categoria?: string | null;
  equipe?: string | null;
  tipo?: string | null;
  causa_raiz?: string | null;
  acoes?: string | null;
  dias_resolucao?: number | null;
  responsavel?: string | null;
  prazo?: string | null;
  foto_doc_id?: string | null;
  fotos?: string | null; // JSON: ["docId",...]
  created_at: string;
}

/** Documento retornado pelo upload de fotos (ponteiro no GED do Core). */
export interface FotoDoc {
  id: string;
  nome: string;
}

/** Disciplinas para categorizar pendências e distribuir às equipes de resolução. */
export const DISCIPLINAS = [
  "Alvenaria/Vedação",
  "Revestimento/Reboco",
  "Pintura",
  "Pisos/Cerâmica",
  "Esquadrias/Vidros",
  "Louças/Metais",
  "Hidráulica",
  "Elétrica",
  "Impermeabilização",
  "Forro/Gesso",
  "Marcenaria/Portas",
  "Limpeza",
  "Outros",
] as const;

export const SEVERIDADE_LABEL: Record<NaoConformidade["severidade"], string> = {
  baixa: "Baixa",
  media: "Média",
  alta: "Alta",
  critica: "Crítica",
};

export const NC_STATUS_LABEL: Record<NaoConformidade["status"], string> = {
  aberta: "Aberta",
  em_correcao: "Em correção",
  reverificar: "Reverificar",
  corrigida: "Corrigida",
  aceita: "Aceita",
};

export interface ModeloForm {
  id: string;
  codigo: string;
  nome: string;
  versao: number;
  estrutura: string; // JSON
}

export interface Termo {
  id: string;
  tipo: string;
  modalidade?: string | null;
  protocolo: string;
  cliente_nome: string;
  assinado_em: string;
  ged_doc_id?: string | null;
}

export interface Construcao {
  situacao: string;
  previsto: { de?: string | null; ate?: string | null };
  total_tarefas: number;
  pendencias: { pacote: string; servico: string; local: string; fim?: string | null }[];
  inspecao_liberada: boolean;
}

export interface EspelhoLinha {
  id: string;
  identificador: string;
  pavimento?: string | null;
  bloco?: string | null;
  categoria: string;
  cliente_nome?: string | null;
  iniciado: boolean;
  etapas: Partial<Record<Etapa["tipo"], Etapa["situacao"]>>;
  nc_abertas: number;
  nc_criticas: number;
}

export const ETAPA_LABEL: Record<Etapa["tipo"], string> = {
  construcao: "Construção",
  inspecao_final: "Inspeção Final",
  vistoria_cliente: "Vistoria do Cliente",
  entrega_chaves: "Entrega das Chaves",
};
