import fs from "fs";
import path from "path";

export interface PrevisionRow {
  id: string;
  service: string;
  job: string;
  replication_group: string;
  floor: string;
  part_counter: string;
  critical_path: string;
  baseline_step_start: string;
  baseline_step_end: string;
  start_date: string;
  end_date: string;
  duration: string;
  material_resources: string;
  responsible: string;
  predecessors: string;
  successors: string;
  real_date_start_at: string;
  real_date_end_at: string;
  real_date_duration: string;
  delay_reasons: string;
}

/** Lê e parseia um CSV exportado do Prevision. Retorna as linhas brutas. */
export function parsePrevisionCsv(csvContent: string): PrevisionRow[] {
  const lines = csvContent.split(/\r?\n/).filter((l) => l.trim());
  if (lines.length < 2) return [];

  const headers = lines[0].split(",").map((h) => h.trim().replace(/^"|"$/g, ""));

  return lines.slice(1).map((line) => {
    const values = splitCsvLine(line);
    const row: Record<string, string> = {};
    headers.forEach((h, i) => {
      row[h] = (values[i] ?? "").trim().replace(/^"|"$/g, "");
    });
    return row as unknown as PrevisionRow;
  });
}

/** Lê o CSV de um caminho no disco. */
export function readPrevisionFile(filePath: string): PrevisionRow[] {
  const abs = path.resolve(filePath);
  if (!fs.existsSync(abs)) throw new Error(`Arquivo não encontrado: ${abs}`);
  return parsePrevisionCsv(fs.readFileSync(abs, "utf8"));
}

// CSV simples: split por vírgula respeitando aspas duplas.
function splitCsvLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      inQuotes = !inQuotes;
    } else if (ch === "," && !inQuotes) {
      result.push(current);
      current = "";
    } else {
      current += ch;
    }
  }
  result.push(current);
  return result;
}
