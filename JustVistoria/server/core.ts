// Acesso ao JustCore (fonte única dos cadastros) e ao GED. O JustVistoria consome
// unidades/clientes/obras/colaboradores do Core e arquiva os termos/relatório no GED do Core.
// Chamadas servidor→servidor usam o x-internal-token.
const CORE_URL = process.env.CORE_URL ?? "http://127.0.0.1:4100";
const INTERNAL = () => process.env.INTERNAL_TOKEN ?? "";

async function get<T>(path: string): Promise<T[]> {
  try {
    const r = await fetch(`${CORE_URL}${path}`, {
      headers: { "x-internal-token": INTERNAL() },
      signal: AbortSignal.timeout(5000),
    });
    if (!r.ok) return [];
    return (await r.json()) as T[];
  } catch {
    return [];
  }
}

export interface CoreRef {
  id: string;
  nome?: string;
  identificador?: string;
  [k: string]: unknown;
}

export const coreObras = () => get<CoreRef>("/api/obras");
export const coreUnidades = () => get<CoreRef>("/api/unidades");
export const coreClientes = () => get<CoreRef>("/api/clientes");
export const coreColaboradores = () => get<CoreRef>("/api/colaboradores");

/** POST genérico ao Core (criar cadastro: cliente/unidade no importador). */
export async function corePost<T = any>(path: string, body: unknown): Promise<T | null> {
  try {
    const r = await fetch(`${CORE_URL}${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-internal-token": INTERNAL() },
      body: JSON.stringify(body),
    });
    if (!r.ok) {
      console.error(`Core POST ${path} falhou:`, r.status, await r.text().catch(() => ""));
      return null;
    }
    return (await r.json()) as T;
  } catch (e) {
    console.error(`Core POST ${path} erro:`, (e as Error).message);
    return null;
  }
}

export interface GedUploadInput {
  buffer: Buffer;
  filename: string;
  contentType?: string;
  /** id da entidade-alvo no Core (a unidade) */
  entidade_id: string;
  entidade_label?: string;
  /** tipo do GED: termo_vistoria_cliente | termo_entrega_chaves | relatorio_entrega_unidade | foto_nc_vistoria */
  tipo_codigo: string;
  categoria?: string;
  sensivel?: boolean;
  metadados?: Record<string, unknown>;
}

/**
 * Arquiva um arquivo no GED do Core (POST /api/documentos), vínculo polimórfico em "unidade".
 * Retorna { id, nome } do documento, ou null em falha (não derruba a operação).
 */
export async function gedUpload(input: GedUploadInput): Promise<{ id: string; nome: string } | null> {
  try {
    const fd = new FormData();
    fd.append("file", new Blob([input.buffer], { type: input.contentType ?? "application/pdf" }), input.filename);
    fd.append("entidade_tipo", "unidade");
    fd.append("entidade_id", input.entidade_id);
    if (input.entidade_label) fd.append("entidade_label", input.entidade_label);
    fd.append("tipo_codigo", input.tipo_codigo);
    fd.append("categoria", input.categoria ?? input.tipo_codigo);
    fd.append("setor", "qualidade");
    fd.append("natureza", "registro");
    fd.append("sensivel", String(input.sensivel ?? false));
    if (input.metadados) fd.append("metadados", JSON.stringify(input.metadados));
    const r = await fetch(`${CORE_URL}/api/documentos`, {
      method: "POST",
      headers: { "x-internal-token": INTERNAL() }, // NÃO setar Content-Type (FormData define o boundary)
      body: fd,
    });
    if (!r.ok) {
      console.error("GED upload falhou:", r.status, await r.text().catch(() => ""));
      return null;
    }
    const doc = (await r.json()) as { id: string; nome_original?: string };
    return { id: doc.id, nome: doc.nome_original ?? input.filename };
  } catch (e) {
    console.error("GED upload erro:", (e as Error).message);
    return null;
  }
}
