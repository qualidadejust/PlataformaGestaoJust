// Importa a base de CUSTO MENSAL POR CARGO (Convenção 2025/26 — anexos "Cálculo Aproximado
// do Custo Mensal"). Valor = "Total do Custo Mensal + Provisões" de cada aba. Re-executável
// (upsert por cargo+competência). Uso: npx tsx prisma/import-custos-cargo.ts
import { prisma } from "../server/lib/prisma.ts";

const db = prisma as any;
const COMPETENCIA = "2026-03"; // vigência da convenção 2025/26 conforme planilha

// cargo, salário base, custo mensal + provisões, fonte (anexo)
const CARGOS: [string, number | null, number, string][] = [
  ["Mestre", 7500.0, 14072.68, "Anexo 03.03"],
  ["Contra Mestre", 3922.6, 7956.91, "Anexo 03.04"],
  ["Almoxarife/Apontador", 2783.0, 6205.1, "Anexo 05.18"],
  ["Oficial", 2783.0, 6205.1, "Anexo 03.07"],
  ["Meio Oficial", 2112.0, 5107.49, "Anexo 03.06"],
  ["Ajudante", 1914.0, 4783.61, "Anexo 03.05"],
  ["Carpinteiro", 2783.0, 6205.1, "Anexo 03.13 (Carpinteiro Estrutura)"],
  ["Armador", 2783.0, 6205.1, "Anexo 03.14"],
  ["Pintor", 2783.0, 6205.1, "Anexo 03.08"],
  ["Operador de Grua", 3675.0, 7664.21, "Anexo 03.15"],
  ["Operador de Guincho", 2783.0, 6205.1, "Anexo 03.15"],
  ["Aux. Engenharia", 3450.0, 3874.51, "Anexo 03.02 (sem FGTS/INSS na planilha — conferir)"],
  ["Estagiário", 900.0, 1226.21, "Anexo 03.02"],
  ["Vigia", 2783.0, 6205.1, "Anexo 05.08"],
  ["Azulegista", 2783.0, 6205.1, "Anexo 03.12"],
  ["Gesseiro", 2783.0, 6205.1, "Anexo 05.09"],
  ["Serralheiro", 2783.0, 6205.1, "Anexo 05.10"],
  ["Pedreiro Balancim", 3200.45, 6887.95, "Anexo 03.09 (+ periculosidade)"],
  ["Oficial de Impermeabilização", 2783.0, 6205.1, "Anexo 03.10"],
];

async function main() {
  let n = 0;
  for (const [cargo, salario_base, custo_mensal, fonte] of CARGOS) {
    await db.custoCargo.upsert({
      where: { cargo_competencia: { cargo, competencia: COMPETENCIA } },
      update: { salario_base, custo_mensal, fonte, jornada_horas: 220 },
      create: { cargo, competencia: COMPETENCIA, salario_base, custo_mensal, fonte, jornada_horas: 220 },
    });
    n++;
  }
  console.log(`✅ ${n} cargos importados/atualizados (competência ${COMPETENCIA}).`);
  console.log("   custo/hora = custo_mensal ÷ 220h. Falta: TÉC SEG TRAB (não veio o valor).");
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
