import type { Readable } from "node:stream";

// Driver de armazenamento de arquivos. `local` = disco (dev); `sharepoint` = Graph (prod).
export type StorageDriver = "local" | "sharepoint";

// Entrada de upload: bytes + a quem o arquivo pertence (vira a taxonomia de pastas).
export interface PutInput {
  entidade_tipo: string;
  entidade_id: string;
  entidade_label?: string; // rótulo legível (ex.: nome do colaborador) p/ a pasta navegável
  categoria: string;
  nome_original: string;
  content_type?: string;
  buffer: Buffer;
}

// Ponteiro devolvido pelo storage; mapeado para as colunas do Documento.
export interface StoredRef {
  driver: StorageDriver;
  drive_id: string | null; // sharepoint: driveId; local: null
  item_id: string; // sharepoint: itemId; local: caminho relativo
  web_url: string | null; // link direto (só usado em arquivo não sensível)
  tamanho: number;
}

// Localizador para ler/remover (subconjunto do StoredRef gravado no banco).
export interface StorageRef {
  drive_id: string | null;
  item_id: string;
}

export interface FetchResult {
  stream: Readable;
  content_type?: string;
  tamanho?: number;
}

export interface StorageService {
  readonly driver: StorageDriver;
  put(input: PutInput): Promise<StoredRef>;
  get(ref: StorageRef): Promise<FetchResult>;
  remove(ref: StorageRef): Promise<void>;
}
