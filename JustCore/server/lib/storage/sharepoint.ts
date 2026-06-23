import { Readable } from "node:stream";
import { randomUUID } from "node:crypto";
import type { StorageService, PutInput, StoredRef, StorageRef, FetchResult } from "./types.ts";

// Driver SharePoint via Microsoft Graph (client-credentials, app-only).
// Configurado por env (ver docs/integracao-sharepoint.md):
//   SP_TENANT_ID, SP_CLIENT_ID, SP_CLIENT_SECRET, SP_SITE
//   SP_ROOT (opcional) = pasta-base na biblioteca Documentos. Default "Plataforma JUST".
// Pendência operacional: consentimento admin do Sites.Selected + liberar o app no site.
const GRAPH = "https://graph.microsoft.com/v1.0";

function reqEnv(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`${name} não configurado (STORAGE_DRIVER=sharepoint exige ${name})`);
  return v;
}

// Codifica o caminho preservando as barras entre segmentos.
function encPath(p: string): string {
  return p.split("/").map(encodeURIComponent).join("/");
}

// Remove caracteres proibidos pelo SharePoint em nome de pasta/arquivo e normaliza espaços.
function sanitizeSp(s: string): string {
  return s.replace(/["*:<>?/\\|#%]+/g, "").replace(/\s+/g, " ").trim().slice(0, 120);
}

// Segmento da entidade na taxonomia: usa "id - rótulo" (ex.: "emp-195 - Adriana...") quando
// há rótulo, para facilitar achar no SharePoint. O app referencia o arquivo por item_id, então
// o nome da pasta é só navegação humana (pode mudar sem quebrar nada).
function entidadeSeg(id: string, label?: string): string {
  const l = label ? sanitizeSp(label) : "";
  return l ? `${id} - ${l}` : id;
}

export class SharePointStorage implements StorageService {
  readonly driver = "sharepoint" as const;
  private token: { value: string; exp: number } | null = null;
  private driveId: string | null = null;

  private async getToken(): Promise<string> {
    const now = Date.now() / 1000;
    if (this.token && this.token.exp - 60 > now) return this.token.value;
    const tenant = reqEnv("SP_TENANT_ID");
    const body = new URLSearchParams({
      client_id: reqEnv("SP_CLIENT_ID"),
      client_secret: reqEnv("SP_CLIENT_SECRET"),
      scope: "https://graph.microsoft.com/.default",
      grant_type: "client_credentials",
    });
    const r = await fetch(`https://login.microsoftonline.com/${tenant}/oauth2/v2.0/token`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
    });
    if (!r.ok) throw new Error(`token Graph falhou (${r.status}): ${await r.text()}`);
    const j = (await r.json()) as { access_token: string; expires_in?: number };
    this.token = { value: j.access_token, exp: now + (j.expires_in ?? 3600) };
    return this.token.value;
  }

  private async graphJson(pathAndQuery: string): Promise<any> {
    const r = await fetch(GRAPH + pathAndQuery, {
      headers: { Authorization: `Bearer ${await this.getToken()}` },
    });
    if (!r.ok) throw new Error(`Graph ${pathAndQuery} falhou (${r.status}): ${await r.text()}`);
    return r.json();
  }

  // Resolve o drive (biblioteca Documentos) do site configurado, e guarda em cache.
  private async getDriveId(): Promise<string> {
    if (this.driveId) return this.driveId;
    const site = reqEnv("SP_SITE"); // ex.: host:/sites/PlataformaJust
    const s = await this.graphJson(`/sites/${site}`);
    const d = await this.graphJson(`/sites/${s.id}/drive`);
    this.driveId = d.id as string;
    return this.driveId;
  }

  async put(input: PutInput): Promise<StoredRef> {
    const token = await this.getToken();
    const driveId = await this.getDriveId();
    const root = process.env.SP_ROOT ?? "Plataforma JUST";
    const folder = `${root}/${input.entidade_tipo}/${entidadeSeg(input.entidade_id, input.entidade_label)}/${input.categoria}`;
    const name = `${randomUUID()}-${input.nome_original}`;
    // Upload simples (PUT /content). Para arquivos muito grandes, migrar p/ upload session.
    const url = `${GRAPH}/drives/${driveId}/root:/${encPath(folder)}/${encPath(name)}:/content`;
    const r = await fetch(url, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": input.content_type ?? "application/octet-stream",
      },
      body: input.buffer,
    });
    if (!r.ok) throw new Error(`upload SharePoint falhou (${r.status}): ${await r.text()}`);
    const item = (await r.json()) as { id: string; webUrl?: string };
    return {
      driver: "sharepoint",
      drive_id: driveId,
      item_id: item.id,
      web_url: item.webUrl ?? null,
      tamanho: input.buffer.length,
    };
  }

  async get(ref: StorageRef): Promise<FetchResult> {
    const token = await this.getToken();
    const driveId = ref.drive_id ?? (await this.getDriveId());
    const r = await fetch(`${GRAPH}/drives/${driveId}/items/${ref.item_id}/content`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!r.ok || !r.body) throw new Error(`download SharePoint falhou (${r.status})`);
    return {
      stream: Readable.fromWeb(r.body as any),
      content_type: r.headers.get("content-type") ?? undefined,
    };
  }

  async remove(ref: StorageRef): Promise<void> {
    const token = await this.getToken();
    const driveId = ref.drive_id ?? (await this.getDriveId());
    const r = await fetch(`${GRAPH}/drives/${driveId}/items/${ref.item_id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!r.ok && r.status !== 404) throw new Error(`remoção SharePoint falhou (${r.status})`);
  }
}
