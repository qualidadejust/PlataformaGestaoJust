/**
 * dataService.ts
 * Interface abstrata do serviço de dados do JustAtestados.
 * Todas as telas importam apenas esta interface (via index.ts),
 * permitindo trocar a implementação (mock → Supabase/Firebase) sem
 * alterar nenhum componente.
 */

import type {
  User,
  Obra,
  Colaborador,
  Cid,
  CentroCusto,
  Cargo,
  AuditEvento,
  Documento,
  DocumentoFiltros,
  DocumentoView,
  ResumoFila,
  Anexo,
  KPI,
} from '../types';

// Re-exporta os tipos para que os consumers possam importar daqui se preferirem
export type {
  User,
  Obra,
  Colaborador,
  Cid,
  CentroCusto,
  Cargo,
  AuditEvento,
  Documento,
  DocumentoFiltros,
  DocumentoView,
  ResumoFila,
  Anexo,
  KPI,
};

export interface DataService {
  // ── Autenticação ──────────────────────────────────────────────────
  /**
   * Autentica o usuário com email e senha.
   * Lança Error (mensagem em PT-BR) quando:
   *   - email ou senha vazios
   *   - credenciais não correspondem a nenhum usuário cadastrado
   */
  login(email: string, senha: string): Promise<User>;

  /** Encerra a sessão (Firebase signOut / Supabase signOut / limpa o mock). */
  logout(): Promise<void>;

  /**
   * Observa a sessão de autenticação. Chama `onChange` com o usuário atual
   * (ou null) imediatamente após assinar e a cada mudança de estado de auth
   * (login, logout, expiração/restauração de sessão persistida).
   * Retorna função para cancelar a inscrição.
   */
  observeSession(onChange: (user: User | null) => void): () => void;

  // ── Usuários / perfis de acesso (gestão pelo RH) ──────────────────
  /** Lista os usuários do sistema (perfis de acesso). Sem expor senha. */
  listUsuarios(): Promise<User[]>;

  /**
   * Cria um novo usuário de login (e-mail + senha) e seu perfil de acesso.
   * `role` define o acesso: `'rh'` (tudo) ou `'apontador'` (só lançamento).
   * A senha vai apenas para o provedor de auth — nunca é gravada no banco.
   * Lança Error (PT-BR) p/ e-mail já em uso, e-mail inválido ou senha fraca.
   */
  createUsuario(input: {
    nome: string;
    email: string;
    senha: string;
    role: User['role'];
  }): Promise<User>;

  // ── Documentos ────────────────────────────────────────────────────
  /**
   * Retorna lista de documentos enriquecidos com dados do colaborador/obra,
   * opcionalmente filtrada.
   * Filtros suportados (todos opcionais, combinados com AND):
   *   - busca: corresponde ao nome/matrícula do colaborador ou motivo/CID
   *   - obraId, cargo, cid (código), tipo, status
   *   - dataInicio / dataFim: filtram por dataLancamento (intervalo inclusivo)
   */
  listDocumentos(filtros?: DocumentoFiltros): Promise<DocumentoView[]>;

  /** Retorna um documento enriquecido pelo id ou null se não encontrado. */
  getDocumento(id: string): Promise<DocumentoView | null>;

  /**
   * Cria um novo documento.
   * O serviço gera automaticamente `id` (UUID) e `ticket` sequencial ("RM-####").
   */
  createDocumento(doc: Omit<Documento, 'id' | 'ticket'>): Promise<Documento>;

  /** Aplica patch parcial sobre um documento existente. */
  updateDocumento(id: string, patch: Partial<Documento>): Promise<Documento>;

  /** Remove permanentemente um documento. */
  deleteDocumento(id: string): Promise<void>;

  // ── Colaboradores ─────────────────────────────────────────────────
  listColaboradores(): Promise<Colaborador[]>;
  getColaborador(id: string): Promise<Colaborador | null>;

  /** Cria um novo colaborador. O serviço gera o `id` automaticamente. */
  createColaborador(c: Omit<Colaborador, 'id'>): Promise<Colaborador>;

  /** Aplica patch parcial sobre um colaborador existente. */
  updateColaborador(id: string, patch: Partial<Colaborador>): Promise<Colaborador>;

  /** Remove permanentemente um colaborador. */
  deleteColaborador(id: string): Promise<void>;

  // ── Obras ─────────────────────────────────────────────────────────
  listObras(): Promise<Obra[]>;

  /** Cria uma nova obra. O serviço gera o `id` automaticamente. */
  createObra(o: Omit<Obra, 'id'>): Promise<Obra>;

  /** Aplica patch parcial sobre uma obra existente. */
  updateObra(id: string, patch: Partial<Obra>): Promise<Obra>;

  /** Remove permanentemente uma obra. */
  deleteObra(id: string): Promise<void>;

  // ── Centros de Custo (CRUD) ───────────────────────────────────────
  listCentrosCusto(): Promise<CentroCusto[]>;

  /** Cria um novo centro de custo. O serviço gera o `id` automaticamente. */
  createCentroCusto(c: Omit<CentroCusto, 'id'>): Promise<CentroCusto>;

  /** Aplica patch parcial sobre um centro de custo existente. */
  updateCentroCusto(id: string, patch: Partial<CentroCusto>): Promise<CentroCusto>;

  /** Remove permanentemente um centro de custo. */
  deleteCentroCusto(id: string): Promise<void>;

  // ── Cargos (CRUD) ─────────────────────────────────────────────────
  listCargos(): Promise<Cargo[]>;

  /** Cria um novo cargo. O serviço gera o `id` automaticamente. */
  createCargo(c: Omit<Cargo, 'id'>): Promise<Cargo>;

  /** Aplica patch parcial sobre um cargo existente. */
  updateCargo(id: string, patch: Partial<Cargo>): Promise<Cargo>;

  /** Remove permanentemente um cargo. */
  deleteCargo(id: string): Promise<void>;

  // ── Auditoria (append-only) ───────────────────────────────────────
  /** Registra um evento de auditoria. `id`/`ts` são preenchidos pelo serviço. */
  logEvento(e: Omit<AuditEvento, 'id' | 'ts'>): Promise<void>;

  /** Lista eventos de auditoria, mais recentes primeiro (limite padrão 100). */
  listEventos(limite?: number): Promise<AuditEvento[]>;

  // ── CID ───────────────────────────────────────────────────────────
  /**
   * Busca CIDs pelo código ou descrição (case-insensitive).
   * Retorna até 20 resultados ordenados por código.
   */
  searchCid(q: string): Promise<Cid[]>;

  // ── Resumo da Fila ────────────────────────────────────────────────
  /**
   * Retorna contadores para os cartões do topo da Fila de Análise RH:
   *   - pendentes: documentos com status 'pendente'
   *   - inconsistentes: documentos com status 'inconsistente'
   *   - aprovadosHoje: documentos aprovados na data corrente
   */
  getResumoFila(): Promise<ResumoFila>;

  // ── KPIs ──────────────────────────────────────────────────────────
  /**
   * Calcula KPIs sobre o conjunto de documentos filtrado.
   * Indicadores retornados:
   *   - Taxa de Absenteísmo (%)
   *   - Dias Perdidos (atestados aprovados)
   *   - Horas Perdidas (declarações aprovadas)
   *   - Custo Estimado (R$)
   * Aceita os mesmos filtros que listDocumentos.
   */
  getKpis(filtros?: DocumentoFiltros): Promise<KPI[]>;
}
