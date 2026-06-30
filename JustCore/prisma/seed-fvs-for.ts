// Seed do modelo FVS-FOR (Forro) — Ficha de Verificação de Serviço para o serviço de forro.
// Piloto Fase A do backbone Prevision. Idempotente (upsert por codigo+versão).
// Uso: npm run db:seed-fvs-for
import { prisma } from "../server/lib/prisma.ts";

const db = prisma as any;

const SECOES: { secao: string; itens: { descricao: string; instrucoes?: string; permite_na?: boolean }[] }[] = [
  {
    secao: "Estrutura de suporte",
    itens: [
      { descricao: "Perfis guia (U) fixados no perímetro conforme projeto", instrucoes: "Verificar alinhamento e ancoragem na alvenaria/laje" },
      { descricao: "Montantes com espaçamento conforme especificação (≤ 600 mm c/c)", instrucoes: "Medir ao menos 3 vãos aleatórios" },
      { descricao: "Estrutura nivelada — tolerância ≤ 3 mm / 2 m", instrucoes: "Usar nível laser ou régua de 2 m com nível de bolha" },
      { descricao: "Juntas de dilatação executadas onde previsto em projeto", permite_na: true },
      { descricao: "Fixações (buchas/parafusos) em quantidade e tipo corretos", instrucoes: "Sem folgas ou peças soltas" },
    ],
  },
  {
    secao: "Placas",
    itens: [
      { descricao: "Placas posicionadas com face correta voltada para baixo" },
      { descricao: "Parafusos com espaçamento correto (borda ≤ 200 mm; campo ≤ 300 mm) e sem recalque excessivo", instrucoes: "Cabeça do parafuso deve ficar levemente abaixo da superfície" },
      { descricao: "Placas sem danos visíveis (trincas, umidade, quebras)" },
      { descricao: "Juntas entre placas não coincidentes com montantes (offset mínimo 200 mm)", instrucoes: "Evita pontos de fraqueza estrutural" },
      { descricao: "Folga perimetral de 5–10 mm em relação à parede" },
    ],
  },
  {
    secao: "Acabamento (massa e fita)",
    itens: [
      { descricao: "Fita de papel/malha aplicada em todos os encontros entre placas" },
      { descricao: "Cabeças de parafusos cobertas com massa" },
      { descricao: "Primeira e segunda demãos de massa aplicadas e secas" },
      { descricao: "Superfície lixada — sem ondulações visíveis ao rasante", instrucoes: "Inspecionar com luz rasante de 45°" },
      { descricao: "Pintura de fundo (selador) aplicada antes da pintura final", permite_na: true },
    ],
  },
  {
    secao: "Instalações embutidas",
    itens: [
      { descricao: "Passagens de eletrodutos coordenadas com a estrutura do forro (sem corte de perfil)" },
      { descricao: "Recortes para luminárias, difusores e sprinklers conforme projeto", permite_na: true },
      { descricao: "Caixas de inspeção instaladas onde especificado (hidrosanitária, elétrica)" },
      { descricao: "Luminária/difusor de ar-condicionado fixados na estrutura, não na placa" },
    ],
  },
  {
    secao: "Conformidade geral",
    itens: [
      { descricao: "Dimensões do forro conforme projeto (tolerância ± 5 mm em planta)", instrucoes: "Verificar largura, comprimento e pé-direito livre" },
      { descricao: "Ausência de manchas de umidade ou eflorescência" },
      { descricao: "Ambiente limpo após conclusão da etapa (retirada de resíduos e embalagens)" },
      { descricao: "Revisão visual de possíveis danos por outras equipes após execução" },
    ],
  },
];

function buildEstrutura() {
  return SECOES.map((s, si) => ({
    secao: s.secao,
    ordem: si + 1,
    itens: s.itens.map((it, ii) => ({
      ordem: ii + 1,
      descricao: it.descricao,
      instrucoes: it.instrucoes ?? "",
      peso: 1,
      resposta: {
        tipo: "sim_nao_na",
        rotulo: "Conforme?",
        permite_na: it.permite_na ?? false,
        exige_justificativa_na: false,
      },
      foto: { permite: true, obrigatoria_se_nc: true },
      gera_nc: { ativo: true, quando: "nao_conforme", severidade_padrao: "media" },
    })),
  }));
}

async function main() {
  // Garante que o tipo FVS existe
  await db.formularioTipo.upsert({
    where: { codigo: "fvs" },
    update: {},
    create: { codigo: "fvs", nome: "Ficha de Verificação de Serviço", sigla: "FVS", categoria: "Inspeção" },
  });

  // Garante que o grupo Acabamentos existe
  await db.formularioGrupo.upsert({
    where: { codigo: "06" },
    update: {},
    create: { codigo: "06", nome: "Acabamentos", sigla: "ACA" },
  });

  const tipoFvs = await db.formularioTipo.findUnique({ where: { codigo: "fvs" } });
  const grupo = await db.formularioGrupo.findUnique({ where: { codigo: "06" } });

  const dados = {
    codigo: "FVS-FOR",
    nome: "FVS — Verificação de Serviço: Forro (Drywall/Gesso)",
    descricao: "Checklist de verificação de qualidade para serviços de forro (drywall, gesso ou PVC). Piloto Fase A — backbone Prevision.",
    cabecalho: "Ficha de Verificação de Serviço — Forro",
    tipo_id: tipoFvs?.id ?? null,
    grupo_id: grupo?.id ?? null,
    escopo: "fvs",
    entidade_alvo: "tarefa",
    versao: 1,
    ativo: true,
    publicado: true,
    config: JSON.stringify({
      avaliados: { local: { informar: true, obrigar: true }, colaborador: { informar: false, obrigar: false } },
      comportamento: { assina_responsavel: true, assina_avaliado: false, exibe_nota: false, calculo_nota: "sem_nota" },
    }),
    estrutura: JSON.stringify(buildEstrutura()),
  };

  const existente = await db.formularioModelo.findFirst({ where: { codigo: "FVS-FOR", versao: 1 } });
  if (existente) {
    await db.formularioModelo.update({ where: { id: existente.id }, data: dados });
    console.log("Modelo FVS-FOR v1 atualizado.");
  } else {
    await db.formularioModelo.create({ data: dados });
    console.log("Modelo FVS-FOR v1 criado.");
  }

  const totalItens = SECOES.reduce((s, sec) => s + sec.itens.length, 0);
  console.log(`FVS-FOR: ${SECOES.length} seções · ${totalItens} itens · escopo=fvs · publicado=true`);
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => { console.error(e); await prisma.$disconnect(); process.exit(1); });
