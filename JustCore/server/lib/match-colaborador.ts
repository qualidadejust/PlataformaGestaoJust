// Casa um nome (detectado pela IA ou vindo de planilha) com um colaborador do cadastro.
// Mesma estratégia do perfilador (scripts/perfilar-docs-rh.ts), extraída para ser reutilizável:
// normaliza (sem acento/maiúsculas) → match exato → todos os tokens contidos → fuzzy (typo).
import { prisma } from "./prisma.ts";

const db = prisma as any;

export type Colab = { id: string; nome: string; status: string };
export type Match = { colaborador: Colab; tipo: "exato" | "tokens" | "fuzzy" } | null;

export const norm = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toUpperCase()
    .replace(/[^A-Z0-9 ]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

// Distância de Levenshtein, para tolerar erro de grafia em nome longo.
function lev(a: string, b: string): number {
  const m = a.length, n = b.length;
  const d = Array.from({ length: m + 1 }, (_, i) => [i, ...Array(n).fill(0)]);
  for (let j = 0; j <= n; j++) d[0][j] = j;
  for (let i = 1; i <= m; i++)
    for (let j = 1; j <= n; j++)
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
  return d[m][n];
}

export async function carregarColaboradores(): Promise<Colab[]> {
  return db.colaborador.findMany({ select: { id: true, nome: true, status: true } });
}

// Casa um nome contra a lista de colaboradores. Retorna null se nada bater com segurança.
export function casar(nomeDetectado: string, colabs: Colab[]): Match {
  const n = norm(nomeDetectado ?? "");
  if (!n) return null;

  // exato
  for (const c of colabs) if (norm(c.nome) === n) return { colaborador: c, tipo: "exato" };

  // todos os tokens do nome cadastrado presentes no nome detectado (e vice-versa)
  const det = new Set(n.split(" "));
  for (const c of colabs) {
    const tk = norm(c.nome).split(" ").filter(Boolean);
    if (tk.length >= 2 && tk.every((t) => det.has(t))) return { colaborador: c, tipo: "tokens" };
  }

  // fuzzy: nome inteiro com distância pequena (só nomes longos, p/ evitar falso positivo)
  if (n.length >= 10) {
    let best: { c: Colab; d: number } | null = null;
    for (const c of colabs) {
      const cn = norm(c.nome);
      if (Math.abs(cn.length - n.length) > 3) continue;
      const d = lev(cn, n);
      if (d <= 2 && (!best || d < best.d)) best = { c, d };
    }
    if (best) return { colaborador: best.c, tipo: "fuzzy" };
  }

  return null;
}
