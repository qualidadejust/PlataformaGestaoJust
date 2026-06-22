// Catálogo inicial de TIPOS de documento do GED (vocabulário controlado). Re-executável
// (upsert por codigo). Uso: npx tsx prisma/import-tipos-documento.ts
import { prisma } from "../server/lib/prisma.ts";

const db = prisma as any;

// codigo, nome, entidade_tipo, sensivel_padrao, versionavel, vence, retencao_dias, obrigatorio
type T = [string, string, string, boolean, boolean, boolean, number | null, boolean];
const TIPOS: T[] = [
  // Colaborador
  ["aso", "ASO (Atestado de Saúde Ocupacional)", "colaborador", true, false, true, 7300, true],
  ["atestado", "Atestado médico", "colaborador", true, false, false, 1825, false],
  ["contrato_trabalho", "Contrato de trabalho", "colaborador", true, false, false, 7300, false],
  ["certificado_treinamento", "Certificado de treinamento (NR)", "colaborador", false, false, true, 1825, false],
  ["doc_pessoal", "Documento pessoal (RG/CPF/CTPS)", "colaborador", true, false, false, 7300, false],
  ["foto_colaborador", "Foto do colaborador", "colaborador", false, false, false, null, false],
  // Obra
  ["projeto", "Projeto (disciplina/revisão)", "obra", false, true, false, null, false],
  ["alvara", "Alvará de construção", "obra", false, false, true, 3650, true],
  ["licenca_ambiental", "Licença ambiental", "obra", false, false, true, 3650, false],
  ["art_rrt", "ART / RRT", "obra", false, false, false, 3650, false],
  ["matricula_obra", "Matrícula / registro do imóvel", "obra", false, false, false, null, false],
  ["diario_obra", "Diário de obra", "obra", false, false, false, 1825, false],
  ["foto_obra", "Foto de obra", "obra", false, false, false, null, false],
  // SST
  ["pgr", "PGR (Programa de Gerenciamento de Riscos)", "obra", false, true, true, 1825, false],
  ["pcmso", "PCMSO", "obra", false, true, true, 1825, false],
  ["termo_epi", "Termo de entrega de EPI", "entrega_epi", false, false, false, 1825, false],
  ["laudo_sst", "Laudo (LTCAT / insalubridade / periculosidade)", "obra", false, false, false, 7300, false],
  // Qualidade
  ["evidencia_fvs", "Evidência de FVS / FVM", "fvs", false, false, false, 1825, false],
  ["certificado_material", "Certificado / laudo de material", "obra", false, false, false, 1825, false],
  // Frota
  ["crlv", "CRLV (documento do veículo)", "veiculo", false, false, true, 365, false],
];

async function main() {
  let n = 0;
  for (const [codigo, nome, entidade_tipo, sensivel_padrao, versionavel, vence, retencao_dias, obrigatorio] of TIPOS) {
    await db.tipoDocumento.upsert({
      where: { codigo },
      update: { nome, entidade_tipo, sensivel_padrao, versionavel, vence, retencao_dias, obrigatorio },
      create: { codigo, nome, entidade_tipo, sensivel_padrao, versionavel, vence, retencao_dias, obrigatorio },
    });
    n++;
  }
  console.log(`✅ ${n} tipos de documento importados/atualizados.`);
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
