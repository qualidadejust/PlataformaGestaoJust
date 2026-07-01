// Camada de FONTE do cronograma (linha de base da obra) — desenhada para múltiplas origens.
// Hoje: CSV exportado do Prevision. Amanhã: API do Prevision (ou outro PMS) implementando a
// mesma interface `FonteCronograma`, sem mudar o importador nem o resto do app.
//
// Mapeamento (ver seção 0 do plano):
//   service -> pacote (prefixo) + serviço cheio       floor -> local (pavimento/área)
//   PER - UNIDADE NNN / ENVIDRAÇAMENTO NNN -> unidade vendável (roster de apartamentos)
//   CHE - CHECK LIST FINAL -> marco "obra pronta" que libera a Inspeção Final
import { readFileSync } from "node:fs";

export interface TarefaNorm {
  prevision_id: string;
  servico: string;
  pacote: string;
  job: string | null;
  local: string;
  inicio: string | null; // YYYY-MM-DD
  fim: string | null;
  critico: boolean;
  predecessores: string | null;
  // se a tarefa é de uma unidade vendável:
  unidade_numero?: string; // "204"
  pavimento?: string; // "2º ANDAR"
}

export interface FonteCronograma {
  nome: string;
  listar(): Promise<TarefaNorm[]>;
}

/** Conserta mojibake (UTF-8 lido como Latin-1): "TÃ‰RREO" -> "TÉRREO". Idempotente o suficiente. */
export function desmojibake(s: string): string {
  if (!/Ã.|Â./.test(s)) return s;
  try {
    const fixed = Buffer.from(s, "latin1").toString("utf8");
    return fixed.includes("�") ? s : fixed;
  } catch {
    return s;
  }
}

/** prefixo do serviço antes do " - " ou "- " (ex.: "ALV- ALVENARIA…" -> "ALV"). */
export function pacoteDe(servico: string): string {
  const m = servico.match(/^\s*([A-Za-zÀ-ÿ/&. ]+?)\s*-/);
  return (m ? m[1] : servico).trim().toUpperCase();
}

/** Extrai o número da unidade de tarefas "… UNIDADE NNN" / "… ENVIDRAÇAMENTO NNN". */
export function extrairUnidade(servico: string): { numero: string; pavimento: string } | null {
  const m = servico.match(/(?:UNIDADE|ENVIDRA[ÇC]AMENTO)\s+(\d{3,4})/i);
  if (!m) return null;
  const numero = m[1];
  const pav = numero.slice(0, numero.length - 2); // 204 -> "2", 1704 -> "17"
  return { numero, pavimento: `${parseInt(pav, 10)}º ANDAR` };
}

const norm = (d: string | null | undefined) => {
  if (!d) return null;
  const m = String(d).match(/^(\d{4}-\d{2}-\d{2})/);
  return m ? m[1] : null;
};

/** Parser CSV simples que respeita campos entre aspas (com vírgulas internas). */
function parseLinha(linha: string): string[] {
  const out: string[] = [];
  let cur = "";
  let aspas = false;
  for (let i = 0; i < linha.length; i++) {
    const c = linha[i];
    if (c === '"') {
      if (aspas && linha[i + 1] === '"') { cur += '"'; i++; }
      else aspas = !aspas;
    } else if (c === "," && !aspas) {
      out.push(cur);
      cur = "";
    } else cur += c;
  }
  out.push(cur);
  return out;
}

/** Fonte CSV (export do Prevision). Colunas: id,service,job,floor,critical_path,start,end,predecessors,successors */
export class CsvFonte implements FonteCronograma {
  nome = "csv";
  constructor(private caminho: string) {}
  async listar(): Promise<TarefaNorm[]> {
    const conteudo = desmojibake(readFileSync(this.caminho, "utf8"));
    const linhas = conteudo.split(/\r?\n/).filter((l) => l.trim());
    const header = parseLinha(linhas[0]).map((h) => h.trim().toLowerCase());
    const idx = (k: string) => header.indexOf(k);
    const out: TarefaNorm[] = [];
    for (let i = 1; i < linhas.length; i++) {
      const c = parseLinha(linhas[i]);
      const servico = (c[idx("service")] ?? "").trim();
      const floor = (c[idx("floor")] ?? "").trim();
      if (!servico || !floor) continue;
      const u = extrairUnidade(servico);
      out.push({
        prevision_id: (c[idx("id")] ?? "").trim(),
        servico,
        pacote: pacoteDe(servico),
        job: (c[idx("job")] ?? "").trim() === "-" ? null : (c[idx("job")] ?? "").trim() || null,
        local: floor,
        inicio: norm(c[idx("start_date")]),
        fim: norm(c[idx("end_date")]),
        critico: /crít/i.test(c[idx("critical_path")] ?? ""),
        predecessores: (c[idx("successors")] ?? "").trim() || null,
        unidade_numero: u?.numero,
        pavimento: u?.pavimento,
      });
    }
    return out;
  }
}

/**
 * STUB da fonte via API do Prevision (futuro). Implementar quando houver credenciais/endpoint:
 * autentica, baixa as tarefas do projeto e normaliza para `TarefaNorm` — mesma interface, então
 * o importador não muda. Outras origens (MS Project, Sienge, etc.) entram do mesmo jeito.
 */
export class PrevisionApiFonte implements FonteCronograma {
  nome = "prevision-api";
  constructor(private cfg: { baseUrl: string; token: string; projetoId: string }) {}
  async listar(): Promise<TarefaNorm[]> {
    throw new Error("PrevisionApiFonte ainda não implementada — use CsvFonte por enquanto. Ver docs/integracao-prevision.md.");
  }
}
