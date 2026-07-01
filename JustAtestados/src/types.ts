export type ViewState =
  | 'login'
  | 'dashboard'
  | 'new_entry'
  | 'meus_envios'
  | 'queue'
  | 'history'
  | 'admin'
  | 'registry';

export type DocumentType = 'atestado' | 'declaracao';
export type Status = 'pendente' | 'aprovado' | 'reprovado' | 'inconsistente';

export interface KPI {
  title: string;
  value: string | number;
  change?: string;
  trend?: 'up' | 'down' | 'neutral';
  suffix?: string;
}

// ── Perfis de acesso ──────────────────────────────────────────────
// 'apontador' enxerga apenas o formulário de envio (new_entry).
// 'rh' enxerga todas as telas (dashboard, fila, consulta, etc.).
export type Role = 'apontador' | 'rh';

export interface User {
  id: string;
  nome: string;
  email: string;
  role: Role;
  cargo?: string;     // ex.: "Analista de RH Senior", "Apontador"
  obraId?: string;    // apontador costuma estar vinculado a uma obra
}

// ── Modelo de domínio ─────────────────────────────────────────────
export interface Obra {
  id: string;
  codigo: string;     // ex.: "001"
  nome: string;       // ex.: "Obra Alfa SP"
  uf: string;         // ex.: "SP"
}

export interface Colaborador {
  id: string;
  matricula: string;
  nome: string;
  cargo: string;      // ex.: "Pedreiro C"
  setor: string;      // ex.: "Operacional"
  obraId: string;
  gestor: string;
  centroCusto: string; // código do C.C., ex.: "0023"
  // Dados pessoais/cadastrais (opcionais — importados da base de RH).
  cpf?: string;            // só dígitos, ex.: "12345678901"
  sexo?: 'M' | 'F';
  dataAdmissao?: string;   // ISO "AAAA-MM-DD"
  dataNascimento?: string; // ISO "AAAA-MM-DD"
  endereco?: string;
  numero?: string;
  cep?: string;
  rg?: string;
  rgEmissor?: string;      // ex.: "SSP"
  rgUf?: string;           // ex.: "PR"
  pis?: string;
  estadoCivil?: string;
  situacao?: string;       // ex.: "Trabalhando", "Auxílio Doença"
}

export interface Cid {
  codigo: string;     // ex.: "A09"
  descricao: string;  // ex.: "Diarreia e gastroenterite de origem infecciosa"
}

// Cargo — entidade gerenciada pelo RH no Admin; alimenta (autocomplete) o campo
// Colaborador.cargo (que guarda o `nome` deste registro).
export interface Cargo {
  id: string;
  nome: string;       // ex.: "Pedreiro"
  setor?: string;     // ex.: "Obra", "Administrativo"
}

// Evento de auditoria (append-only) — registra ações relevantes do sistema.
export interface AuditEvento {
  id: string;
  ts: string;         // ISO datetime (momento do evento)
  usuario: string;    // nome de quem executou
  acao: string;       // ex.: "Aprovação", "Recusa", "Lançamento", "Novo usuário"
  modulo: string;     // ex.: "Fila de Análise", "Novo Lançamento", "Administração"
  detalhe: string;    // descrição livre
}

// Centro de Custo — entidade gerenciada pelo RH no Admin; alimenta o cadastro
// de colaborador (Colaborador.centroCusto guarda o `codigo` deste registro).
export interface CentroCusto {
  id: string;
  codigo: string;     // ex.: "CC-045-SP"
  nome: string;       // ex.: "Operacional - Obra Alfa"
}

// Turno de uma declaração de comparecimento.
export type Periodo = 'manha' | 'tarde' | 'integral';

// Arquivo anexado a um documento (foto/PDF do atestado ou declaração).
// dataUrl é o conteúdo em base64 (data: URL) para persistir no mock/localStorage.
export interface Anexo {
  nome: string;       // nome original do arquivo
  tipo: string;       // MIME type (ex.: "application/pdf", "image/jpeg")
  tamanho: number;    // bytes
  dataUrl: string;    // conteúdo base64 (data:...)
}

export interface Documento {
  id: string;
  ticket: string;            // ex.: "RM-2810"
  tipo: DocumentType;
  status: Status;
  colaboradorId: string;
  dataLancamento: string;    // ISO date (YYYY-MM-DD)
  dataAnalise?: string;      // ISO date em que o RH aprovou/reprovou
  analista?: string;         // nome do analista de RH que avaliou
  anexo?: Anexo | null;      // arquivo anexado
  gedDocumentoId?: string;   // PONTE: referencia um doc JÁ existente no GED (não re-sobe arquivo)

  // ── Autoria e devolução ──
  apontadorId?: string;      // uid de quem enviou o documento
  apontadorNome?: string;    // nome de quem enviou
  motivo?: string;           // motivo/orientação do RH ao recusar (devolver p/ correção)

  // ── Atestado ──
  dataEmissao?: string;      // ISO date
  dias?: number;             // dias de afastamento (autocalculado)
  cid?: Cid | null;          // null quando "sem CID informado"
  medicoNome?: string;
  medicoCrm?: string;

  // ── Declaração de comparecimento ──
  dataComparecimento?: string; // ISO date
  periodo?: Periodo;
  horaInicio?: string;         // "HH:mm"
  horaFim?: string;            // "HH:mm"
  horas?: number;              // horas de afastamento (autocalculado)
  local?: string;              // local/motivo do atendimento
}

// Filtros aceitos por listDocumentos / getKpis.
export interface DocumentoFiltros {
  busca?: string;        // nome do colaborador, matrícula ou motivo
  obraId?: string;
  cargo?: string;
  cid?: string;
  tipo?: DocumentType;
  status?: Status;
  dataInicio?: string;   // ISO date
  dataFim?: string;      // ISO date
}

// Documento já com os dados do colaborador/obra resolvidos, para exibição.
// É o que listDocumentos/getDocumento retornam — as telas não precisam fazer join.
export interface DocumentoView extends Documento {
  colaboradorNome: string;
  matricula: string;
  cargo: string;
  setor: string;
  gestor: string;
  obraNome: string;
  obraUf: string;
}

// Resumo dos cartões do topo da Fila de Análise RH.
export interface ResumoFila {
  pendentes: number;       // documentos com status 'pendente'
  inconsistentes: number;  // documentos com status 'inconsistente'
  aprovadosHoje: number;   // documentos aprovados na data de hoje (dataAnalise)
}
