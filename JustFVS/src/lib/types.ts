export interface Obra {
  id: string;
  nome: string;
  status: string;
}

export interface Servico {
  id: string;
  sigla_prancha: string;
  nome: string;
}

export interface Local {
  id: string;
  obra_id: string;
  zona: string;
  pavimento: string;
  nome: string | null;
}

export interface Tarefa {
  id: string;
  obra_id: string;
  local_id: string;
  local: Local;
  servico_id: string;
  servico: Servico;
  external_id: string;
  job: string | null;
  baseline_inicio: string | null;
  baseline_fim: string | null;
  real_inicio: string | null;
  real_fim: string | null;
  duracao: number | null;
  critico: boolean;
  avanco_pct: number;
}

export interface FormularioModelo {
  id: string;
  codigo: string;
  nome: string;
  escopo: string;
  versao: number;
  publicado: boolean;
  estrutura: string; // JSON
  config: string | null; // JSON
  servico_sigla: string | null;
}

export interface NaoConformidade {
  id: string;
  instancia_id: string;
  item_ref: string;
  descricao: string;
  causa: string | null;
  acao_corretiva: string | null;
  responsavel_id: string | null;
  responsavel_nome: string | null;
  prazo: string | null;
  severidade: string;
  status: string; // aberta | em_acao | reverificacao | fechada
  instancia_reverificacao_id: string | null;
  aberta_em: string;
  fechada_em: string | null;
  created_at: string;
}

export interface SequenciaQualidade {
  id: string;
  obra_id: string | null;
  servico_sigla: string;
  depende_de_sigla: string;
  ordem: number;
  ativo: boolean;
}

export interface ItemResposta {
  ordem: number;
  descricao: string;
  instrucoes?: string;
  peso?: number;
  resposta: {
    tipo: string; // sim_nao_na | texto | numero | ...
    rotulo?: string;
    permite_na?: boolean;
    exige_justificativa_na?: boolean;
  };
  foto?: { permite: boolean; obrigatoria_se_nc?: boolean };
  gera_nc?: { ativo: boolean; quando?: string; severidade_padrao?: string };
}

export interface SecaoEstrutural {
  secao: string;
  ordem: number;
  itens: ItemResposta[];
}

export interface RespostaItem {
  secao: string;
  item: number;
  tipo: string;
  valor: string | null; // "sim" | "nao" | "na" | texto | number
  obs?: string;
}

export interface FormularioInstancia {
  id: string;
  modelo_id: string;
  modelo_codigo: string;
  modelo_versao: number;
  escopo: string | null;
  entidade_tipo: string | null;
  entidade_id: string | null;
  entidade_label: string | null;
  respostas: string; // JSON
  nota: number | null;
  total_nc: number;
  preenchido_em: string | null;
  autor_nome: string | null;
  created_at: string;
}
