import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const IMPORT_DIR = path.resolve(__dirname, '..', 'data', 'import');
const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter } as any);

// ---------- CSV ----------
function splitCSV(line: string): string[] {
  const out: string[] = [];
  let cur = '', q = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (q) {
      if (c === '"') { if (line[i + 1] === '"') { cur += '"'; i++; } else q = false; }
      else cur += c;
    } else {
      if (c === '"') q = true;
      else if (c === ',') { out.push(cur); cur = ''; }
      else cur += c;
    }
  }
  out.push(cur);
  return out;
}
function readCSV(file: string): Record<string, string>[] {
  const t = fs.readFileSync(path.join(IMPORT_DIR, file), 'utf8').replace(/^﻿/, '');
  const lines = t.split(/\r?\n/).filter(l => l.trim());
  const header = splitCSV(lines[0]).map(h => h.trim());
  return lines.slice(1).map(l => {
    const cells = splitCSV(l);
    const row: Record<string, string> = {};
    header.forEach((h, i) => { row[h] = (cells[i] ?? '').trim(); });
    return row;
  });
}

// ---------- Helpers ----------
const CONNECTORS = new Set(['de', 'da', 'do', 'das', 'dos', 'e']);
function titleCase(s: string): string {
  return s.trim().toLowerCase().split(/\s+/).map((w, i) =>
    (i > 0 && CONNECTORS.has(w)) ? w : w.charAt(0).toUpperCase() + w.slice(1)
  ).join(' ');
}

function normDate(v: string): string | null {
  if (!v || v === '00/00/0000') return null;
  // dd/mm/yyyy
  const m = v.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (m) {
    const [, d, mo, y] = m;
    if (d === '00' || mo === '00') return null;
    return `${y}-${mo}-${d}`;
  }
  // epoch millis (pode ser negativo)
  if (/^-?\d+$/.test(v)) {
    const dt = new Date(Number(v));
    if (isNaN(dt.getTime())) return null;
    return dt.toISOString().slice(0, 10);
  }
  return null;
}

// Cargo (CodCargo) -> área funcional (organograma)
const AREA_BY_CARGO: Record<string, string> = {
  '1': 'Engenharia', '4': 'Engenharia', '5': 'Engenharia', '6': 'Engenharia', '9': 'Engenharia',
  '10': 'Engenharia', '12': 'Engenharia', '13': 'Engenharia', '15': 'Engenharia', '16': 'Engenharia',
  '17': 'Engenharia', '18': 'Engenharia', '19': 'Engenharia', '20': 'Engenharia', '22': 'Engenharia',
  '23': 'Engenharia', '24': 'Engenharia', '25': 'Engenharia', '26': 'Engenharia', '27': 'Engenharia',
  '28': 'Engenharia', '29': 'Engenharia', '30': 'Engenharia', '31': 'Engenharia', '32': 'Engenharia',
  '33': 'Engenharia', '34': 'Engenharia', '36': 'Engenharia', '43': 'Engenharia',
  '38': 'Arquitetura', '14': 'Arquitetura',
  '2': 'Administrativo', '3': 'Administrativo', '7': 'Administrativo', '8': 'Administrativo',
  '11': 'Administrativo', '37': 'Administrativo', '39': 'Administrativo', '42': 'Administrativo',
  '41': 'Comercial',
  '40': 'Segurança do Trabalho',
  '35': 'Diretoria',
};
// Cargos de liderança -> is_manager
const MANAGER_CARGOS = new Set(['13', '23', '35', '36', '42']);

async function main() {
  const cargos = readCSV('BaseCargos.csv');
  const ccustos = readCSV('BaseCCustos.csv');
  const colaboradores = readCSV('BaseColaboradores.csv');

  const cargoMap = new Map(cargos.map(c => [c['CodCargo'], (c['NomeCargo'] || '').trim()]));
  const ccustoMap = new Map(ccustos.filter(c => c['CodCCusto']).map(c => [c['CodCCusto'], (c['NomeCCusto'] || '').trim()]));

  const ativos = colaboradores.filter(c => c['NomeColaborador'] && c['Status'] === 'Ativo');

  // ---- Zerar dados de pessoas (mantém ciclos e modelos) ----
  await prisma.calibration.deleteMany();
  await prisma.feedback.deleteMany();
  await prisma.evaluationScore.deleteMany();
  await prisma.potentialScore.deleteMany();
  await prisma.evaluation.deleteMany();
  await prisma.pdiAction.deleteMany();
  await prisma.pdiPlan.deleteMany();
  await prisma.employee.deleteMany();
  console.log('Dados de pessoas zerados (ciclos e modelos mantidos).');

  const data = ativos.map(c => {
    const cod = c['CodCargo'];
    return {
      id: `emp-${c['ID']}`,
      name: titleCase(c['NomeColaborador']),
      role: titleCase(cargoMap.get(cod) || 'Não informado'),
      department: AREA_BY_CARGO[cod] || 'Outros',
      cost_center: ccustoMap.get(c['CodCCusto']) || null,
      admission_date: normDate(c['DataAdmissao']),
      is_manager: MANAGER_CARGOS.has(cod),
    };
  });

  for (const d of data) {
    await prisma.employee.create({ data: d });
  }

  // ---- Resumo ----
  const byArea: Record<string, number> = {};
  const byObra: Record<string, number> = {};
  let managers = 0;
  for (const d of data) {
    byArea[d.department] = (byArea[d.department] || 0) + 1;
    const o = d.cost_center || '(sem obra)';
    byObra[o] = (byObra[o] || 0) + 1;
    if (d.is_manager) managers++;
  }
  console.log(`\nColaboradores importados: ${data.length} (${managers} líderes)`);
  console.log('\nPor área:');
  Object.entries(byArea).sort((a, b) => b[1] - a[1]).forEach(([k, v]) => console.log(`  ${String(v).padStart(3)}  ${k}`));
  console.log('\nPor obra / centro de custo:');
  Object.entries(byObra).sort((a, b) => b[1] - a[1]).forEach(([k, v]) => console.log(`  ${String(v).padStart(3)}  ${k}`));
  console.log('\nImportação concluída.');
}

main().catch(console.error).finally(() => prisma.$disconnect());
