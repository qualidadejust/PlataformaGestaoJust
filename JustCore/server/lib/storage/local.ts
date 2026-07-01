import fs from "node:fs";
import fsp from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { fileURLToPath } from "node:url";
import type { StorageService, PutInput, StoredRef, StorageRef, FetchResult } from "./types.ts";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
// Raiz dos arquivos em dev: JustCore/storage (gitignored). Override via STORAGE_DIR.
const ROOT = process.env.STORAGE_DIR
  ? path.resolve(process.env.STORAGE_DIR)
  : path.resolve(__dirname, "../../../storage");

// Limpa um segmento de caminho: tira separadores, "..", e caracteres problemáticos.
function seg(name: string): string {
  return (
    name
      .replace(/[^\w.\-]+/g, "_")
      .replace(/\.{2,}/g, "_")
      .replace(/^\.+/, "_")
      .slice(0, 120) || "_"
  );
}

// Resolve um caminho relativo dentro de ROOT, barrando path traversal.
function resolveInside(rel: string): string {
  const abs = path.resolve(ROOT, rel);
  if (abs !== ROOT && !abs.startsWith(ROOT + path.sep)) throw new Error("caminho inválido");
  return abs;
}

export class LocalDiskStorage implements StorageService {
  readonly driver = "local" as const;

  async put(input: PutInput): Promise<StoredRef> {
    const entidadeSeg = input.entidade_label
      ? `${seg(input.entidade_id)}-${seg(input.entidade_label)}`
      : seg(input.entidade_id);
    const rel = path.posix.join(
      seg(input.entidade_tipo),
      entidadeSeg,
      seg(input.categoria),
      `${randomUUID()}-${seg(input.nome_original)}`,
    );
    const abs = resolveInside(rel);
    await fsp.mkdir(path.dirname(abs), { recursive: true });
    await fsp.writeFile(abs, input.buffer);
    return { driver: "local", drive_id: null, item_id: rel, web_url: null, tamanho: input.buffer.length };
  }

  async get(ref: StorageRef): Promise<FetchResult> {
    const abs = resolveInside(ref.item_id);
    const stat = await fsp.stat(abs);
    return { stream: fs.createReadStream(abs), tamanho: stat.size };
  }

  async remove(ref: StorageRef): Promise<void> {
    const abs = resolveInside(ref.item_id);
    await fsp.rm(abs, { force: true });
  }
}
