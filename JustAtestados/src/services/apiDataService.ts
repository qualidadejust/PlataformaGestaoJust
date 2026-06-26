/**
 * apiDataService.ts
 * Implementação de DataService para a Plataforma JUST:
 *   - documentos/auditoria/KPIs → back do JustAtestados (/api/...)
 *   - cadastro (colaborador/obra/cargo) → JustCore (/core/api/...) — NÃO duplica
 *   - auth → JustCore (/core/api/auth) — token guardado pelo api-base
 *   - anexo → GED do Core (o back arquiva; aqui só referencia o download)
 * As telas continuam usando a mesma interface; só a fonte mudou.
 */
import type { DataService } from "./dataService";
import type {
  User, Obra, Colaborador, Cid, CentroCusto, Cargo, AuditEvento,
  Documento, DocumentoFiltros, DocumentoView, ResumoFila, Anexo, KPI,
} from "../types";
import { searchCidCatalogo } from "./cidCatalog";
import { TOKEN_KEY } from "../api-base";

const API = "/api"; // back do JustAtestados
const CORE = "/core/api"; // JustCore

const SO_CORE = "Este cadastro é gerenciado no JustCore (fonte única). Edite por lá.";

async function jfetch<T>(url: string, init?: RequestInit): Promise<T> {
  const r = await fetch(url, init);
  if (!r.ok) throw new Error((await r.json().catch(() => ({})))?.error || `Erro ${r.status}`);
  return (r.status === 204 ? undefined : await r.json()) as T;
}
const jget = <T>(url: string) => jfetch<T>(url);
const jsend = <T>(url: string, method: string, body?: unknown) =>
  jfetch<T>(url, {
    method,
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });

// ── Mapeamentos Core → tipos do app ────────────────────────────────────────
function mapUser(u: any): User {
  const perfis: string[] = u.perfis ?? [];
  const perm: string[] = u.perm ?? [];
  const role: User["role"] =
    perfis.includes("admin") || perfis.includes("rh") || perm.includes("atestados.aprovar") ? "rh" : "apontador";
  return { id: u.id, nome: u.colaborador?.nome ?? u.email, email: u.email, role };
}

function alocPrincipal(c: any): any {
  return c.alocacoes?.find((a: any) => a.principal) ?? c.alocacoes?.[0] ?? null;
}
function mapColaborador(c: any): Colaborador {
  const a = alocPrincipal(c);
  return {
    id: c.id,
    matricula: c.matricula ?? "",
    nome: c.nome,
    cargo: c.cargo?.nome ?? "",
    setor: c.setor ?? "",
    obraId: a?.obra?.id ?? "",
    gestor: a?.responsavel ? "" : "",
    centroCusto: a?.obra?.cost_center ?? "",
    cpf: c.cpf ?? undefined,
    sexo: c.sexo ?? undefined,
    dataAdmissao: c.data_admissao ?? undefined,
    dataNascimento: c.data_nascimento ?? undefined,
    endereco: c.endereco ?? undefined,
    numero: c.numero ?? undefined,
    cep: c.cep ?? undefined,
    rg: c.rg ?? undefined,
    rgEmissor: c.rg_emissor ?? undefined,
    rgUf: c.rg_uf ?? undefined,
    pis: c.pis ?? undefined,
    estadoCivil: c.estado_civil ?? undefined,
    situacao: c.situacao ?? undefined,
  };
}
const mapObra = (o: any): Obra => ({ id: o.id, codigo: o.cost_center ?? "", nome: o.nome, uf: o.uf ?? "" });
const mapCargo = (c: any): Cargo => ({ id: c.id, nome: c.nome, setor: c.nivel ?? undefined });

// adivinha o MIME pelo nome (p/ decidir imagem × pdf na visualização)
function guessTipo(nome?: string | null): string {
  const n = (nome ?? "").toLowerCase();
  if (n.endsWith(".pdf")) return "application/pdf";
  if (/\.(png|jpe?g|webp|gif|bmp)$/.test(n)) return "image/" + (n.split(".").pop() || "jpeg");
  return "application/octet-stream";
}

// ── Atestado (back, snake) ↔ Documento/DocumentoView (app, camel) ───────────
function toView(r: any): DocumentoView {
  return {
    id: r.id,
    ticket: r.ticket,
    tipo: r.tipo,
    status: r.status,
    colaboradorId: r.colaborador_id ?? "",
    dataLancamento: r.data_lancamento,
    dataAnalise: r.data_analise ?? undefined,
    analista: r.analista ?? undefined,
    apontadorId: r.apontador_id ?? undefined,
    apontadorNome: r.apontador_nome ?? undefined,
    motivo: r.motivo ?? undefined,
    dataEmissao: r.data_emissao ?? undefined,
    dias: r.dias ?? undefined,
    cid: r.cid_codigo ? { codigo: r.cid_codigo, descricao: r.cid_descricao ?? "" } : null,
    medicoNome: r.medico_nome ?? undefined,
    medicoCrm: r.medico_crm ?? undefined,
    dataComparecimento: r.data_comparecimento ?? undefined,
    periodo: r.periodo ?? undefined,
    horaInicio: r.hora_inicio ?? undefined,
    horaFim: r.hora_fim ?? undefined,
    horas: r.horas ?? undefined,
    local: r.local ?? undefined,
    anexo: r.ged_documento_id
      ? { nome: r.anexo_nome ?? "anexo", tipo: guessTipo(r.anexo_nome), tamanho: 0, dataUrl: `${CORE}/documentos/${r.ged_documento_id}/download` }
      : null,
    // enriquecidos (snapshot guardado na transação)
    colaboradorNome: r.colaborador_nome ?? "—",
    matricula: r.matricula ?? "—",
    cargo: r.cargo ?? "—",
    setor: r.setor ?? "—",
    gestor: r.gestor ?? "—",
    obraNome: r.obra_nome ?? "—",
    obraUf: r.obra_uf ?? "—",
  };
}

// data: URL base64 → Blob (para enviar o anexo como arquivo multipart)
function dataUrlToBlob(dataUrl: string): Blob {
  const [head, b64] = dataUrl.split(",");
  const mime = head.match(/data:([^;]+)/)?.[1] ?? "application/octet-stream";
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return new Blob([bytes], { type: mime });
}

// monta os campos snake p/ o back a partir do Documento (camel)
function toBody(doc: Partial<Documento>): Record<string, any> {
  const b: Record<string, any> = {};
  const set = (k: string, v: any) => { if (v !== undefined) b[k] = v; };
  set("tipo", doc.tipo);
  set("colaborador_id", doc.colaboradorId);
  set("data_lancamento", doc.dataLancamento);
  set("apontador_id", doc.apontadorId);
  set("apontador_nome", doc.apontadorNome);
  set("status", doc.status);
  set("motivo", doc.motivo);
  set("analista", doc.analista);
  set("data_analise", doc.dataAnalise);
  set("data_emissao", doc.dataEmissao);
  set("dias", doc.dias);
  set("medico_nome", doc.medicoNome);
  set("medico_crm", doc.medicoCrm);
  set("data_comparecimento", doc.dataComparecimento);
  set("periodo", doc.periodo);
  set("hora_inicio", doc.horaInicio);
  set("hora_fim", doc.horaFim);
  set("horas", doc.horas);
  set("local", doc.local);
  set("ged_documento_id", doc.gedDocumentoId); // ponte: referencia doc já no GED
  if (doc.cid !== undefined) {
    b.cid_codigo = doc.cid?.codigo ?? null;
    b.cid_descricao = doc.cid?.descricao ?? null;
  }
  return b;
}

// resolve o snapshot do colaborador a partir do Core (fonte única)
async function snapshotColaborador(colaboradorId?: string): Promise<Record<string, any>> {
  if (!colaboradorId) return {};
  try {
    const c: any = await jget(`${CORE}/colaboradores/${colaboradorId}`);
    const a = alocPrincipal(c);
    return {
      colaborador_nome: c.nome ?? null,
      matricula: c.matricula ?? null,
      cargo: c.cargo?.nome ?? null,
      setor: c.setor ?? null,
      obra_id: a?.obra?.id ?? null,
      obra_nome: a?.obra?.nome ?? null,
      obra_uf: a?.obra?.uf ?? null,
      centro_custo: a?.obra?.cost_center ?? null,
    };
  } catch {
    return {};
  }
}

// envia (POST/PUT) com anexo opcional via multipart
async function enviarComAnexo(url: string, method: string, fields: Record<string, any>, anexo?: Anexo | null) {
  if (anexo?.dataUrl?.startsWith("data:")) {
    const fd = new FormData();
    for (const [k, v] of Object.entries(fields)) if (v !== undefined && v !== null) fd.append(k, String(v));
    fd.append("file", dataUrlToBlob(anexo.dataUrl), anexo.nome);
    const r = await fetch(url, { method, body: fd });
    if (!r.ok) throw new Error((await r.json().catch(() => ({})))?.error || `Erro ${r.status}`);
    return r.json();
  }
  return jsend<any>(url, method, fields);
}

export class ApiDataService implements DataService {
  // ── Auth ──────────────────────────────────────────────────────────────────
  async login(email: string, senha: string): Promise<User> {
    const j = await jsend<{ token: string; usuario: any }>(`${CORE}/auth/login`, "POST", { email, senha });
    localStorage.setItem(TOKEN_KEY, j.token);
    return mapUser(j.usuario);
  }
  async logout(): Promise<void> {
    localStorage.removeItem(TOKEN_KEY);
  }
  observeSession(onChange: (user: User | null) => void): () => void {
    if (!localStorage.getItem(TOKEN_KEY)) {
      onChange(null);
      return () => {};
    }
    jget<any>(`${CORE}/auth/me`)
      .then((u) => onChange(mapUser(u)))
      .catch(() => onChange(null));
    return () => {};
  }
  async listUsuarios(): Promise<User[]> {
    try {
      const us = await jget<any[]>(`${CORE}/acessos/usuarios`);
      return us.map((u) => ({
        id: u.id,
        nome: u.colaborador?.nome ?? u.email,
        email: u.email,
        role: (u.perfis ?? []).some((p: any) => p.nome === "admin" || p.nome === "rh") ? "rh" : "apontador",
      }));
    } catch {
      return []; // sem acesso.admin: gestão de usuários fica no Core
    }
  }
  async createUsuario(): Promise<User> {
    throw new Error("Crie usuários no JustCore → Controle de acesso (a senha temporária é exibida lá).");
  }

  // ── Documentos ──────────────────────────────────────────────────────────────
  async listDocumentos(filtros?: DocumentoFiltros): Promise<DocumentoView[]> {
    const qs = new URLSearchParams();
    if (filtros?.busca) qs.set("busca", filtros.busca);
    if (filtros?.obraId) qs.set("obra_id", filtros.obraId);
    if (filtros?.cargo) qs.set("cargo", filtros.cargo);
    if (filtros?.cid) qs.set("cid", filtros.cid);
    if (filtros?.tipo) qs.set("tipo", filtros.tipo);
    if (filtros?.status) qs.set("status", filtros.status);
    if (filtros?.dataInicio) qs.set("dataInicio", filtros.dataInicio);
    if (filtros?.dataFim) qs.set("dataFim", filtros.dataFim);
    const rows = await jget<any[]>(`${API}/atestados?${qs.toString()}`);
    return rows.map(toView);
  }
  async getDocumento(id: string): Promise<DocumentoView | null> {
    try {
      return toView(await jget<any>(`${API}/atestados/${id}`));
    } catch {
      return null;
    }
  }
  async createDocumento(doc: Omit<Documento, "id" | "ticket">): Promise<Documento> {
    const snap = await snapshotColaborador(doc.colaboradorId);
    const body = { ...toBody(doc), ...snap };
    const row = await enviarComAnexo(`${API}/atestados`, "POST", body, doc.anexo);
    return toView(row);
  }
  async updateDocumento(id: string, patch: Partial<Documento>): Promise<Documento> {
    // Decisão do RH passa pelos endpoints protegidos (atestados.aprovar).
    if (patch.status === "aprovado") return toView(await jsend(`${API}/atestados/${id}/aprovar`, "POST", { analista: patch.analista }));
    if (patch.status === "reprovado") return toView(await jsend(`${API}/atestados/${id}/reprovar`, "POST", { analista: patch.analista, motivo: patch.motivo }));
    // Reenvio/edição: anexo novo (se houver) vai pro GED; demais campos via PUT.
    if (patch.anexo?.dataUrl?.startsWith("data:")) {
      const fd = new FormData();
      fd.append("file", dataUrlToBlob(patch.anexo.dataUrl), patch.anexo.nome);
      const r = await fetch(`${API}/atestados/${id}/anexo`, { method: "POST", body: fd });
      if (!r.ok) throw new Error((await r.json().catch(() => ({})))?.error || "Falha ao enviar o anexo");
    }
    const { anexo, ...rest } = patch;
    void anexo;
    const body = toBody(rest);
    if (rest.colaboradorId) Object.assign(body, await snapshotColaborador(rest.colaboradorId));
    return toView(await jsend(`${API}/atestados/${id}`, "PUT", body));
  }
  async deleteDocumento(id: string): Promise<void> {
    await jsend(`${API}/atestados/${id}`, "DELETE");
  }

  // ── Colaboradores / Obras / Cargos / CC (LEITURA do Core) ───────────────────
  async listColaboradores(): Promise<Colaborador[]> {
    return (await jget<any[]>(`${CORE}/colaboradores`)).map(mapColaborador);
  }
  async getColaborador(id: string): Promise<Colaborador | null> {
    try { return mapColaborador(await jget<any>(`${CORE}/colaboradores/${id}`)); } catch { return null; }
  }
  async createColaborador(): Promise<Colaborador> { throw new Error(SO_CORE); }
  async updateColaborador(): Promise<Colaborador> { throw new Error(SO_CORE); }
  async deleteColaborador(): Promise<void> { throw new Error(SO_CORE); }

  async listObras(): Promise<Obra[]> {
    return (await jget<any[]>(`${CORE}/obras`)).map(mapObra);
  }
  async createObra(): Promise<Obra> { throw new Error(SO_CORE); }
  async updateObra(): Promise<Obra> { throw new Error(SO_CORE); }
  async deleteObra(): Promise<void> { throw new Error(SO_CORE); }

  async listCargos(): Promise<Cargo[]> {
    return (await jget<any[]>(`${CORE}/cargos`)).map(mapCargo).sort((a, b) => a.nome.localeCompare(b.nome));
  }
  async createCargo(): Promise<Cargo> { throw new Error(SO_CORE); }
  async updateCargo(): Promise<Cargo> { throw new Error(SO_CORE); }
  async deleteCargo(): Promise<void> { throw new Error(SO_CORE); }

  async listCentrosCusto(): Promise<CentroCusto[]> {
    // Centro de custo = cost_center das obras do Core (sem cadastro paralelo).
    const obras = await jget<any[]>(`${CORE}/obras`);
    const seen = new Map<string, CentroCusto>();
    for (const o of obras) {
      const cc = o.cost_center;
      if (cc && !seen.has(cc)) seen.set(cc, { id: cc, codigo: cc, nome: o.nome });
    }
    return [...seen.values()];
  }
  async createCentroCusto(): Promise<CentroCusto> { throw new Error(SO_CORE); }
  async updateCentroCusto(): Promise<CentroCusto> { throw new Error(SO_CORE); }
  async deleteCentroCusto(): Promise<void> { throw new Error(SO_CORE); }

  // ── Auditoria ───────────────────────────────────────────────────────────────
  async logEvento(e: Omit<AuditEvento, "id" | "ts">): Promise<void> {
    try { await jsend(`${API}/eventos`, "POST", e); } catch { /* auditoria não derruba a UI */ }
  }
  async listEventos(limite = 100): Promise<AuditEvento[]> {
    const es = await jget<any[]>(`${API}/eventos?limite=${limite}`);
    return es.map((e) => ({ id: e.id, ts: e.created_at, usuario: e.usuario ?? "—", acao: e.acao, modulo: e.modulo ?? "", detalhe: e.detalhe ?? "" }));
  }

  // ── CID (catálogo estático) ─────────────────────────────────────────────────
  async searchCid(q: string): Promise<Cid[]> {
    return searchCidCatalogo(q);
  }

  // ── Resumo / KPIs ───────────────────────────────────────────────────────────
  async getResumoFila(): Promise<ResumoFila> {
    return jget<ResumoFila>(`${API}/resumo-fila`);
  }
  async getKpis(filtros?: DocumentoFiltros): Promise<KPI[]> {
    const qs = new URLSearchParams();
    if (filtros?.dataInicio) qs.set("dataInicio", filtros.dataInicio);
    if (filtros?.dataFim) qs.set("dataFim", filtros.dataFim);
    const k = await jget<{ total: number; aprovados: number; diasPerdidos: number; horasPerdidas: number }>(
      `${API}/kpis?${qs.toString()}`,
    );
    let nColab = 0;
    try { nColab = (await jget<any[]>(`${CORE}/colaboradores`)).length; } catch { /* segue com 0 */ }
    const diasUteisRef = 22;
    const taxa = nColab === 0 ? "0.00" : ((k.diasPerdidos / (nColab * diasUteisRef)) * 100).toFixed(2);
    const custo = k.diasPerdidos * 147;
    return [
      { title: "Taxa de Absenteísmo", value: taxa, suffix: "%", trend: parseFloat(taxa) > 3 ? "up" : "down", change: "vs. meta de 3%" },
      { title: "Dias Perdidos (Atestados)", value: k.diasPerdidos, trend: k.diasPerdidos > 0 ? "up" : "neutral", change: "atestados aprovados" },
      { title: "Horas Perdidas (Declarações)", value: k.horasPerdidas, suffix: "h", trend: k.horasPerdidas > 0 ? "up" : "neutral", change: "declarações aprovadas" },
      { title: "Custo Estimado", value: custo, trend: custo > 0 ? "up" : "neutral", change: "impacto direto estimado" },
    ];
  }
}
