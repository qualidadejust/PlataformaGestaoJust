// Catálogo de TIPOS de documento do GED (vocabulário controlado), derivado da PGQ - Lista
// Mestra de Documentos (rev.19) e do Mapa de Controle de Registros (rev.15) da JUST.
// Re-executável (upsert por codigo). Uso: npx tsx prisma/import-tipos-documento.ts
//
// natureza: padrao (modelo/SGQ controlado, versiona) | registro (evidência preenchida, retém).
// setor: eixo de navegação (espelha a árvore de pastas). retencao_dias: prazo de guarda do Mapa
// (20 anos=7300, 25 anos=9125, 5 anos=1825, 1 ano=365). Ver server/lib/ged-taxonomia.ts.
import { prisma } from "../server/lib/prisma.ts";

const db = prisma as any;

// codigo, nome, entidade_tipo, natureza, setor, sensivel, versionavel, vence, retencao_dias, obrigatorio
type T = [string, string, string, string, string | null, boolean, boolean, boolean, number | null, boolean];
const TIPOS: T[] = [
  // ── REGISTROS — Colaborador (RH / SST) ──────────────────────────────────────
  ["aso", "ASO (Atestado de Saúde Ocupacional)", "colaborador", "registro", "sst", true, false, true, 7300, true],
  ["atestado", "Atestado médico", "colaborador", "registro", "sst", true, false, false, 1825, false],
  ["contrato_trabalho", "Contrato de trabalho", "colaborador", "registro", "rh", true, false, false, 7300, false],
  ["ficha_admissao", "Ficha de admissão de colaborador", "colaborador", "registro", "rh", true, false, false, 7300, false],
  ["ficha_perfil", "Ficha de avaliação de perfil", "colaborador", "registro", "rh", false, false, false, null, false],
  ["alteracao_funcao", "Controle de alteração de função e salário", "colaborador", "registro", "rh", true, false, false, 7300, false],
  ["ordem_servico", "Ordem de serviço (SST)", "colaborador", "registro", "sst", false, false, false, 1825, false],
  ["certificado_treinamento", "Certificado de treinamento (NR-10/12/18/35)", "colaborador", "registro", "rh", false, false, true, 1825, false],
  ["ficha_epi", "Ficha de controle de EPI", "colaborador", "registro", "sst", false, false, false, 1825, false],
  ["doc_pessoal", "Documento pessoal (RG/CPF/CTPS)", "colaborador", "registro", "rh", true, false, false, 7300, false],
  ["foto_colaborador", "Foto do colaborador", "colaborador", "registro", "rh", false, false, false, null, false],

  // ── REGISTROS — Obra (Engenharia / Qualidade / SST / Jurídico / Ambiental) ───
  ["projeto", "Projeto (disciplina/revisão)", "obra", "registro", "projetos", false, true, false, null, false],
  ["alvara", "Alvará de construção", "obra", "registro", "juridico", false, false, true, 9125, true],
  ["art_rrt", "ART / RRT", "obra", "registro", "engenharia", false, false, false, 9125, false],
  ["licenca_ambiental", "Licença ambiental", "obra", "registro", "ambiental", false, false, true, 3650, false],
  ["matricula_obra", "Matrícula / registro do imóvel", "obra", "registro", "juridico", false, false, false, null, false],
  ["diario_obra", "Diário de obra", "obra", "registro", "engenharia", false, false, false, null, false],
  ["foto_obra", "Foto / relatório fotográfico de obra", "obra", "registro", "engenharia", false, false, false, null, false],
  ["laudo_concreto", "Laudo de ensaio de concreto", "obra", "registro", "qualidade", false, false, false, 9125, false],
  ["laudo_estacas", "Laudo de qualidade das estacas", "obra", "registro", "qualidade", false, false, false, 9125, false],
  ["relatorio_concreto", "Relatório de aceitação do concreto", "obra", "registro", "qualidade", false, false, false, 9125, false],
  ["laudo_nbr15575", "Laudo NBR 15575 (desempenho)", "obra", "registro", "qualidade", false, false, false, 9125, false],
  ["certificado_calibracao", "Certificado de calibração", "obra", "registro", "qualidade", false, false, true, null, false],
  ["controle_rastreabilidade", "Controle e rastreabilidade estrutural", "obra", "registro", "qualidade", false, false, false, 9125, false],
  ["pqo", "PQO / PCT (plano de qualidade da obra)", "obra", "registro", "qualidade", false, true, false, null, false],
  // SST por obra
  ["pgr", "PGR (Programa de Gerenciamento de Riscos)", "obra", "registro", "sst", false, true, true, 7300, false],
  ["pcmso", "PCMSO", "obra", "registro", "sst", false, true, true, 7300, false],
  ["pcmat_ppra", "PCMAT / PPRA", "obra", "registro", "sst", false, false, false, 7300, false],
  ["doc_grua", "Documentação de grua e cremalheira", "obra", "registro", "sst", false, false, true, 9125, false],
  ["laudo_sst", "Laudo (LTCAT / insalubridade / periculosidade)", "obra", "registro", "sst", false, false, false, 7300, false],
  ["pgrcc", "PGRCC (resíduos da construção)", "obra", "registro", "ambiental", false, false, false, 1825, false],

  // ── REGISTROS — outras entidades ─────────────────────────────────────────────
  ["termo_epi", "Termo de entrega de EPI (assinado)", "entrega_epi", "registro", "sst", false, false, false, 1825, false],
  ["evidencia_fvs", "Evidência de FVS / FVM", "fvs", "registro", "qualidade", false, false, false, 1825, false],
  ["certificado_material", "Certificado / laudo de material", "obra", "registro", "qualidade", false, false, false, 1825, false],
  ["crlv", "CRLV (documento do veículo)", "veiculo", "registro", null, false, false, true, 365, false],
  // Fornecedores (Aquisição / Suprimentos)
  ["ficha_prequalificacao", "Ficha de pré-qualificação de fornecedor", "fornecedor", "registro", "suprimentos", false, false, false, null, false],
  ["avaliacao_fornecedor", "Avaliação de fornecedor / prestador", "fornecedor", "registro", "suprimentos", false, false, false, null, false],
  ["declaracao_conformidade", "Declaração de conformidade do fornecedor", "fornecedor", "registro", "suprimentos", false, false, false, null, false],
  // Terceiros (ciclo início → medição → finalização)
  ["contrato_terceiro", "Contrato de terceiro", "terceiro", "registro", "juridico", false, false, true, 9125, false],
  ["doc_inicio_terceiro", "Documentação de início de terceiro (CND/ART/ASO)", "terceiro", "registro", "rh", true, false, false, 9125, false],
  ["medicao_terceiro", "Medição de terceiro", "terceiro", "registro", "suprimentos", false, true, false, null, false],
  ["termo_finalizacao_terceiro", "Termo de finalização de contrato de terceiro", "terceiro", "registro", "juridico", false, false, false, 9125, false],

  // ── DOCUMENTOS PADRÃO (SGQ controlado) — globais da empresa, versionam ────────
  ["sgq_manual", "Manual (padrão)", "empresa", "padrao", "qualidade", false, true, false, null, false],
  ["sgq_politica", "Política (padrão)", "empresa", "padrao", "qualidade", false, true, false, null, false],
  ["sgq_procedimento", "Procedimento (padrão)", "empresa", "padrao", "qualidade", false, true, false, null, false],
  ["sgq_it", "Instrução de Trabalho (padrão)", "empresa", "padrao", "engenharia", false, true, false, null, false],
  ["sgq_formulario", "Formulário (padrão)", "empresa", "padrao", "qualidade", false, true, false, null, false],
  ["sgq_plano", "Plano (padrão)", "empresa", "padrao", "qualidade", false, true, false, null, false],
  ["sgq_lista", "Lista (padrão)", "empresa", "padrao", "qualidade", false, true, false, null, false],
  ["sgq_quadro", "Quadro (padrão)", "empresa", "padrao", "qualidade", false, true, false, null, false],
  ["sgq_cartilha", "Cartilha (padrão)", "empresa", "padrao", "rh", false, true, false, null, false],
];

async function main() {
  let n = 0;
  for (const [codigo, nome, entidade_tipo, natureza, setor, sensivel_padrao, versionavel, vence, retencao_dias, obrigatorio] of TIPOS) {
    const data = { nome, entidade_tipo, natureza, setor, sensivel_padrao, versionavel, vence, retencao_dias, obrigatorio };
    await db.tipoDocumento.upsert({ where: { codigo }, update: data, create: { codigo, ...data } });
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
