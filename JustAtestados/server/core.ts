// Acesso ao JustCore (fonte única dos cadastros) e ao GED. O JustAtestados consome
// colaboradores/obras/cargos do Core e arquiva o anexo do atestado no GED do Core
// (documento SENSÍVEL — CID/saúde). Chamadas servidor→servidor usam o x-internal-token.
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
  [k: string]: unknown;
}

export const coreColaboradores = () => get<CoreRef>("/api/colaboradores");
export const coreObras = () => get<CoreRef>("/api/obras");
export const coreCargos = () => get<CoreRef>("/api/cargos");

// Marca um documento do GED como APROVADO (sai da fila de análise do JustDocs). Usado quando
// um doc que chegou pelo WhatsApp é finalizado virando atestado aqui (ponte). Devolve o nome.
export async function gedMarcarAprovado(docId: string): Promise<{ id: string; nome?: string } | null> {
  try {
    const r = await fetch(`${CORE_URL}/api/documentos/${docId}/analise`, {
      method: "POST",
      headers: { "x-internal-token": INTERNAL(), "Content-Type": "application/json" },
      body: JSON.stringify({ acao: "aprovar" }),
      signal: AbortSignal.timeout(5000),
    });
    if (!r.ok) return null;
    const d = (await r.json()) as { id: string; nome_original?: string };
    return { id: d.id, nome: d.nome_original };
  } catch {
    return null;
  }
}

export interface GedUploadInput {
  buffer: Buffer;
  filename: string;
  contentType?: string;
  colaborador_id: string;
  colaborador_nome?: string;
  /** atestado | declaracao (vira categoria/tipo no GED) */
  categoria?: string;
}

/**
 * Arquiva o anexo no GED do Core (POST /api/documentos), sempre como SENSÍVEL.
 * Retorna { id, nome } do documento criado, ou null em falha (não derruba o lançamento).
 */
export async function gedUpload(input: GedUploadInput): Promise<{ id: string; nome: string } | null> {
  try {
    const fd = new FormData();
    fd.append("file", new Blob([input.buffer], { type: input.contentType ?? "application/octet-stream" }), input.filename);
    fd.append("entidade_tipo", "colaborador");
    fd.append("entidade_id", input.colaborador_id);
    if (input.colaborador_nome) fd.append("entidade_label", input.colaborador_nome);
    fd.append("categoria", input.categoria ?? "atestado");
    fd.append("sensivel", "true"); // CID/saúde → LGPD
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
