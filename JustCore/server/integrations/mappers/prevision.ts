import type { PrevisionRow } from "../previsionClient.ts";

export interface MappedLocal {
  obra_id: string;
  zona: string;
  pavimento: string;
  nome: string;
  origem: "PREVISION";
}

export interface MappedServico {
  sigla_prancha: string;
  nome: string;
  origem: "PREVISION";
}

export interface MappedTarefa {
  obra_id: string;
  // local e servico resolvidos depois do upsert
  zona: string;
  pavimento: string;
  sigla_prancha: string;
  external_id: string;
  job: string | null;
  baseline_inicio: Date | null;
  baseline_fim: Date | null;
  real_inicio: Date | null;
  real_fim: Date | null;
  duracao: number | null;
  critico: boolean;
  predecessores: string | null;
  successores: string | null;
  material_resources: string | null;
  origem: "PREVISION";
}

/** Extrai a sigla do service: tudo antes de " - " ou "- ". */
export function extractSigla(service: string): string {
  const match = service.match(/^(.+?)\s*-\s+/);
  return match ? match[1].trim() : service.trim();
}

/** Normaliza o nome do serviço (parte após o prefixo). */
export function extractNomeServico(service: string): string {
  const parts = service.split(/\s*-\s+/);
  return parts.length >= 2 ? parts.slice(1).join(" - ").trim() : service.trim();
}

function parseDate(raw: string): Date | null {
  if (!raw || raw === "-" || raw.trim() === "") return null;
  // Formatos possíveis: DD/MM/YYYY ou YYYY-MM-DD
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(raw.trim())) {
    const [d, m, y] = raw.trim().split("/");
    return new Date(`${y}-${m}-${d}`);
  }
  const d = new Date(raw.trim());
  return isNaN(d.getTime()) ? null : d;
}

function parseFloat_(raw: string): number | null {
  if (!raw || raw === "-") return null;
  const n = parseFloat(raw.replace(",", "."));
  return isNaN(n) ? null : n;
}

/** Monta os três conjuntos de dados a partir das linhas brutas do CSV. */
export function mapPrevisionRows(
  rows: PrevisionRow[],
  obra_id: string
): { locais: MappedLocal[]; servicos: MappedServico[]; tarefas: MappedTarefa[] } {
  const locaisMap = new Map<string, MappedLocal>();
  const servicosMap = new Map<string, MappedServico>();
  const tarefas: MappedTarefa[] = [];

  for (const row of rows) {
    // Ignora linhas sem ID
    if (!row.id || row.id === "-") continue;

    const zona = row.replication_group?.trim() || "SEM ZONA";
    const pavimento = row.floor?.trim() || "SEM PAVIMENTO";
    const sigla = extractSigla(row.service || "");
    const nomeServico = extractNomeServico(row.service || "");

    // Local único por obra+zona+pavimento
    const localKey = `${zona}||${pavimento}`;
    if (!locaisMap.has(localKey)) {
      locaisMap.set(localKey, {
        obra_id,
        zona,
        pavimento,
        nome: `${zona} — ${pavimento}`,
        origem: "PREVISION",
      });
    }

    // Serviço único por sigla
    if (sigla && !servicosMap.has(sigla)) {
      servicosMap.set(sigla, {
        sigla_prancha: sigla,
        nome: nomeServico,
        origem: "PREVISION",
      });
    }

    // external_id: id + part_counter (quando há mais de uma parte)
    const partCounter = row.part_counter?.trim();
    const external_id =
      partCounter && partCounter !== "-" && partCounter !== "1"
        ? `${row.id}_${partCounter}`
        : row.id;

    tarefas.push({
      obra_id,
      zona,
      pavimento,
      sigla_prancha: sigla,
      external_id,
      job: row.job && row.job !== "-" ? row.job.trim() : null,
      baseline_inicio: parseDate(row.baseline_step_start),
      baseline_fim: parseDate(row.baseline_step_end),
      real_inicio: parseDate(row.real_date_start_at),
      real_fim: parseDate(row.real_date_end_at),
      duracao: parseFloat_(row.duration),
      critico: row.critical_path?.toLowerCase() === "crítica" || row.critical_path?.toLowerCase() === "critica",
      predecessores: row.predecessors && row.predecessors !== "-" ? row.predecessors.trim() : null,
      successores: row.successors && row.successors !== "-" ? row.successors.trim() : null,
      material_resources: row.material_resources && row.material_resources !== "-" ? row.material_resources.trim() : null,
      origem: "PREVISION",
    });
  }

  return {
    locais: [...locaisMap.values()],
    servicos: [...servicosMap.values()],
    tarefas,
  };
}
