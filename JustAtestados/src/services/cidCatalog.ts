/**
 * cidCatalog.ts
 * Catálogo CID-10/CID-O do DataSUS, servido como ativo estático do site
 * (public/cid10.json — gerado por scripts/build-cid-catalog.mjs).
 *
 * É dado de referência fixo (igual em qualquer backend), então fica no app:
 * carregado UMA vez (lazy + memoizado) e pesquisado/validado em memória.
 * Usado por todas as implementações de DataService.searchCid e pela
 * validação do CID no envio do formulário.
 */
import type { Cid } from '../types';

// Mapa { codigo → descrição } carregado de /cid10.json.
let cache: Record<string, string> | null = null;
let loading: Promise<Record<string, string>> | null = null;

async function load(): Promise<Record<string, string>> {
  if (cache) return cache;
  if (!loading) {
    loading = fetch('/cid10.json')
      .then((r) => {
        if (!r.ok) throw new Error('Falha ao carregar o catálogo de CID.');
        return r.json() as Promise<Record<string, string>>;
      })
      .then((data) => {
        cache = data;
        return data;
      })
      .catch((e) => {
        loading = null; // permite nova tentativa
        throw e;
      });
  }
  return loading;
}

/** Normaliza para busca insensível a caixa e acento. */
const norm = (s: string) => s.toLowerCase().normalize('NFD').replace(/\p{Diacritic}/gu, '');

/** Busca por código ou descrição (insensível a caixa/acento). */
export async function searchCidCatalogo(q: string, limite = 30): Promise<Cid[]> {
  const termo = q.trim();
  if (!termo) return [];
  const data = await load();
  const nq = norm(termo);
  const out: Cid[] = [];
  for (const [codigo, descricao] of Object.entries(data)) {
    if (norm(codigo).includes(nq) || norm(descricao).includes(nq)) {
      out.push({ codigo, descricao });
      if (out.length >= limite) break;
    }
  }
  return out.sort((a, b) => a.codigo.localeCompare(b.codigo));
}

/** True se o código for um CID válido do catálogo. */
export async function isCidValido(codigo: string): Promise<boolean> {
  const data = await load();
  return Boolean(data[codigo.trim().toUpperCase()]);
}

/** Retorna o Cid completo (código + descrição) ou null se inexistente. */
export async function getCid(codigo: string): Promise<Cid | null> {
  const data = await load();
  const cod = codigo.trim().toUpperCase();
  const descricao = data[cod];
  return descricao ? { codigo: cod, descricao } : null;
}

/** Total de códigos no catálogo. */
export async function getCidCount(): Promise<number> {
  const data = await load();
  return Object.keys(data).length;
}

/** Lista os primeiros `limite` CIDs (ordenados por código) — para visualização. */
export async function listCidsCatalogo(limite = 50): Promise<Cid[]> {
  const data = await load();
  return Object.keys(data)
    .sort((a, b) => a.localeCompare(b))
    .slice(0, limite)
    .map((codigo) => ({ codigo, descricao: data[codigo] }));
}
