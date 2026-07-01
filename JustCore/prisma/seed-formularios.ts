// Seed do MOTOR DE FORMULÁRIOS (Core): catálogo (tipos + grupos de inspeção) e promoção do
// checklist FVC do JustVistoria como modelo transversal do Core. Idempotente (upsert).
// Uso: npm run db:seed-formularios
import { prisma } from "../server/lib/prisma.ts";

const db = prisma as any;

// --- Tipos de formulário (catálogo) ---
const TIPOS: { codigo: string; nome: string; sigla?: string; categoria: string; titulo_relatorio?: string }[] = [
  { codigo: "fve", nome: "Ficha de Vistoria e Entrega", sigla: "FVE", categoria: "Inspeção", titulo_relatorio: "Vistoria & Entrega" },
  { codigo: "fvs", nome: "Ficha de Verificação de Serviço", sigla: "FVS", categoria: "Inspeção" },
  { codigo: "fvm", nome: "Ficha de Verificação de Material", sigla: "FVM", categoria: "Inspeção" },
  { codigo: "avf", nome: "Avaliação de Fornecedor", sigla: "AVF", categoria: "Avaliação de Fornecedores" },
  { codigo: "iat", nome: "Inspeção de Assistência Técnica", sigla: "IAT", categoria: "Inspeção" },
  { codigo: "clima", nome: "Pesquisa de Clima", sigla: "CLI", categoria: "Survey" },
];

// --- Grupos de inspeção / disciplinas (espelha Mobuss + pacotes do Prevision) ---
const GRUPOS: { codigo: string; nome: string; sigla?: string }[] = [
  { codigo: "00", nome: "Geral", sigla: "GER" },
  { codigo: "01", nome: "Fundações", sigla: "FUN" },
  { codigo: "02", nome: "Estruturas", sigla: "EST" },
  { codigo: "03", nome: "Alvenaria/Vedação", sigla: "ALV" },
  { codigo: "04", nome: "Revestimentos", sigla: "REV" },
  { codigo: "05", nome: "Instalações", sigla: "INS" },
  { codigo: "06", nome: "Acabamentos", sigla: "ACA" },
  { codigo: "07", nome: "Esquadrias/Vidros", sigla: "ESQ" },
  { codigo: "08", nome: "Impermeabilização", sigla: "IMP" },
  { codigo: "SEG", nome: "Segurança", sigla: "SEG" },
  { codigo: "LIM", nome: "Limpeza", sigla: "LIM" },
];

// --- FVC (Ficha de Vistoria do Cliente) — promovido ao Core no formato rico (seção → itens). ---
const FVC_SIMPLES: { grupo: string; itens: string[] }[] = [
  { grupo: "OBSERVAÇÕES", itens: ["De acordo com o manual descritivo / memorial"] },
  { grupo: "SALA", itens: ["Piso", "Rodapé", "Pintura parede", "Pintura teto / forro", "Janelas e esquadrias", "Tomadas e interruptores", "Iluminação"] },
  { grupo: "COZINHA", itens: ["Bancada / cuba / metais", "Revestimento", "Piso", "Pontos hidráulicos", "Pontos elétricos", "Ponto de gás"] },
  { grupo: "QUARTO", itens: ["Piso", "Pintura parede", "Pintura teto", "Porta e fechadura", "Janela / esquadria", "Tomadas e interruptores"] },
  { grupo: "SUÍTE", itens: ["Piso", "Pintura parede", "Pintura teto", "Porta e fechadura", "Janela / esquadria", "Tomadas e interruptores"] },
  { grupo: "BANHEIRO", itens: ["Louças (bacia / cuba)", "Metais", "Revestimento parede", "Piso", "Box / vidro", "Ventilação / exaustão"] },
  { grupo: "ÁREA DE SERVIÇO", itens: ["Tanque", "Pontos hidráulicos", "Piso", "Pintura"] },
  { grupo: "SACADA / VARANDA", itens: ["Piso", "Guarda-corpo", "Pintura", "Esquadrias / envidraçamento", "Ponto de gás (churrasqueira)"] },
  { grupo: "GERAL", itens: ["Portas internas", "Fechaduras e chaves", "Forro de gesso", "Quadro de disjuntores", "Infra de ar-condicionado", "Limpeza final"] },
];

/** Converte o formato simples ({grupo,itens:[str]}) para o rico (seção→itens com resposta/gera-NC). */
function paraEstruturaRica(simples: typeof FVC_SIMPLES) {
  return simples.map((s, si) => ({
    secao: s.grupo,
    ordem: si + 1,
    itens: s.itens.map((descricao, ii) => ({
      ordem: ii + 1,
      descricao,
      instrucoes: "",
      peso: 1,
      resposta: { tipo: "sim_nao_na", rotulo: "Conforme?", permite_na: true, exige_justificativa_na: false },
      foto: { permite: true, obrigatoria_se_nc: true },
      gera_nc: { ativo: true, quando: "nao_conforme", severidade_padrao: "media" },
    })),
  }));
}

const FVC_CONFIG = {
  avaliados: {
    local: { informar: true, obrigar: true },
    colaborador: { informar: true, obrigar: false },
  },
  comportamento: {
    assina_responsavel: true,
    assina_avaliado: true, // o comprador assina
    exibe_nota: false,
    calculo_nota: "sem_nota",
  },
};

async function main() {
  // 1) Tipos
  for (const t of TIPOS) {
    await db.formularioTipo.upsert({
      where: { codigo: t.codigo },
      update: { nome: t.nome, sigla: t.sigla ?? null, categoria: t.categoria, titulo_relatorio: t.titulo_relatorio ?? null },
      create: { codigo: t.codigo, nome: t.nome, sigla: t.sigla ?? null, categoria: t.categoria, titulo_relatorio: t.titulo_relatorio ?? null },
    });
  }
  // 2) Grupos
  for (const g of GRUPOS) {
    await db.formularioGrupo.upsert({
      where: { codigo: g.codigo },
      update: { nome: g.nome, sigla: g.sigla ?? null },
      create: { codigo: g.codigo, nome: g.nome, sigla: g.sigla ?? null },
    });
  }
  // 3) Promove o FVC como modelo transversal do Core (escopo vistoria, alvo unidade).
  const tipoFve = await db.formularioTipo.findUnique({ where: { codigo: "fve" } });
  const estrutura = JSON.stringify(paraEstruturaRica(FVC_SIMPLES));
  const dadosFvc = {
    codigo: "FVC",
    nome: "FVC — Ficha de Vistoria do Cliente (inspeção final)",
    descricao: "Checklist de inspeção final / vistoria do cliente por ambiente.",
    cabecalho: "Ficha de Vistoria do Cliente",
    tipo_id: tipoFve?.id ?? null,
    escopo: "vistoria",
    entidade_alvo: "unidade",
    versao: 1,
    ativo: true,
    publicado: true,
    config: JSON.stringify(FVC_CONFIG),
    estrutura,
  };
  const existente = await db.formularioModelo.findFirst({ where: { codigo: "FVC", versao: 1 } });
  if (existente) {
    await db.formularioModelo.update({ where: { id: existente.id }, data: dadosFvc });
    console.log("Modelo FVC v1 atualizado no Core.");
  } else {
    await db.formularioModelo.create({ data: dadosFvc });
    console.log("Modelo FVC v1 criado no Core.");
  }

  console.log(`Tipos: ${TIPOS.length} | Grupos: ${GRUPOS.length} | Modelo FVC promovido (escopo=vistoria, alvo=unidade).`);
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
