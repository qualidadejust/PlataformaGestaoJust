/**
 * Semeia o catálogo de indicadores com os KPIs reais do Planejamento Estratégico (PEJ)
 * da Construtora JUST — por setor, no padrão SMART (fórmula, meta, periodicidade, responsável).
 * Fontes: PGQ Quadro de Objetivos, tabela "Sugestão de indicadores" (24.03.2026) e slides de acompanhamento.
 *
 * Rodar: npx tsx prisma/seed-indicadores-pej.ts   (idempotente — não duplica)
 */
import { prisma } from '../server/lib/prisma.js';

type Ind = { nome: string; formula?: string; meta?: string; unidade?: string; direcao?: 'maior' | 'menor'; periodicidade?: string };

const CATALOGO: { setor: string; responsavel: string; cargo_alvo?: string; indicadores: Ind[] }[] = [
  {
    setor: 'Qualidade', responsavel: 'Samuel Beienke',
    indicadores: [
      { nome: '% conformidade do sistema', formula: '% de itens/requisitos conformes nas auditorias', meta: '≥ 95%', unidade: '%', direcao: 'maior', periodicidade: 'trimestral' },
      { nome: '% NC em auditorias', formula: 'Nº NC ÷ total de itens auditados × 100', meta: '≤ 5%', unidade: '%', direcao: 'menor', periodicidade: 'trimestral' },
      { nome: 'Objetivos de sustentabilidade', formula: 'Consumo por m² (energia/água/resíduos)', meta: 'Energia ≤15 kWh/m²; Água ≤1 m³/m²; Resíduos ≤0,5 m³/m²', direcao: 'menor', periodicidade: 'por obra entregue' },
      { nome: 'Nº de processos mapeados e otimizados', formula: 'Processos com fluxograma + app/formulário', meta: '≥ 80% dos processos críticos', direcao: 'maior', periodicidade: 'mensal' },
      { nome: 'Adoção dos apps pelos usuários', formula: '% usuários ativos ÷ usuários alvo × 100', meta: '≥ 85%', unidade: '%', direcao: 'maior', periodicidade: 'mensal' },
    ],
  },
  {
    setor: 'Obra', responsavel: 'Sandro Oliveira (Eng. Residente)', cargo_alvo: 'Mestre de Obra',
    indicadores: [
      { nome: 'Performance de Prazo (SPI)', formula: '% avanço físico conforme cronograma', meta: '≥ 95%', unidade: '%', direcao: 'maior', periodicidade: 'mensal' },
      { nome: 'Performance de Custo (CPI)', formula: '% custo real vs. orçado', meta: '≥ 90%', unidade: '%', direcao: 'maior', periodicidade: 'mensal' },
      { nome: 'NC de execução', formula: 'Nº de não conformidades na execução', meta: 'reduzir', unidade: 'ocorrências', direcao: 'menor', periodicidade: 'mensal' },
      { nome: 'PPC — Percentual de Pacotes Concluídos', formula: 'Pacotes concluídos ÷ pacotes planejados × 100', meta: '≥ 80%', unidade: '%', direcao: 'maior', periodicidade: 'semanal' },
      { nome: 'Produtividade', formula: 'Avanço físico por equipe/período', meta: 'aumentar', direcao: 'maior', periodicidade: 'mensal' },
    ],
  },
  {
    setor: 'Segurança do Trabalho', responsavel: 'Segurança do Trabalho', cargo_alvo: 'Mestre de Obra',
    indicadores: [
      { nome: '% conformidade de segurança', formula: 'Itens conformes em inspeção de segurança ÷ total × 100', meta: '≥ 95%', unidade: '%', direcao: 'maior', periodicidade: 'mensal' },
      { nome: 'Acidentes', formula: 'Nº de acidentes registrados no período', meta: '0', unidade: 'ocorrências', direcao: 'menor', periodicidade: 'mensal' },
      { nome: 'Situações de quase acidente', formula: 'Nº de quase acidentes reportados', meta: 'monitorar', unidade: 'ocorrências', direcao: 'menor', periodicidade: 'mensal' },
      { nome: 'Atendimento a Normas (NRs)', formula: '% de conformidade com NRs aplicáveis', meta: '100%', unidade: '%', direcao: 'maior', periodicidade: 'mensal' },
    ],
  },
  {
    setor: 'RH', responsavel: 'Adriana Polletti',
    indicadores: [
      { nome: 'Faltas injustificadas', formula: 'Dias de faltas injustificadas ÷ dias previstos × 100', meta: '≤ 1% ao mês', unidade: '%', direcao: 'menor', periodicidade: 'mensal' },
      { nome: 'Taxa de absenteísmo', formula: 'Horas/dias de ausência ÷ horas/dias contratados × 100', meta: '≤ 3% ao mês', unidade: '%', direcao: 'menor', periodicidade: 'mensal' },
      { nome: 'Percentual de horas extras', formula: 'Horas extras ÷ horas normais × 100', meta: '5% a 10% ao mês', unidade: '%', direcao: 'menor', periodicidade: 'mensal' },
      { nome: 'Satisfação interna (clima)', formula: 'Média geral da pesquisa de clima', meta: '≥ 4,0', direcao: 'maior', periodicidade: 'semestral' },
    ],
  },
  {
    setor: 'Financeiro', responsavel: 'Marcelo Monteiro',
    indicadores: [
      { nome: 'Inadimplência dos recebíveis', formula: 'Saldo em atraso ÷ saldo total a receber × 100', meta: '≤ 5%', unidade: '%', direcao: 'menor', periodicidade: 'mensal' },
      { nome: 'Controle Orçamentário (Realizado x Orçado)', formula: '(Realizado − Orçado) ÷ Orçado × 100', meta: 'Receitas ±3%; Despesas ≤ +5%', unidade: '%', direcao: 'menor', periodicidade: 'mensal' },
      { nome: '% conformidade SIENGE', formula: '% de lançamentos conformes no SIENGE', meta: '≥ 95%', unidade: '%', direcao: 'maior', periodicidade: 'mensal' },
    ],
  },
  {
    setor: 'Suprimentos', responsavel: 'Diego Leodoro',
    indicadores: [
      { nome: '% conformidade de solicitações', formula: 'Solicitações sem erro ÷ total × 100', meta: '≥ 95%', unidade: '%', direcao: 'maior', periodicidade: 'mensal' },
      { nome: 'Tempo de atendimento de solicitações', formula: 'Média de dias entre abertura e conclusão', meta: '90% em ≤ 2 dias', unidade: 'dias', direcao: 'menor', periodicidade: 'mensal' },
      { nome: '% pedidos entregues no prazo', formula: 'Pedidos no prazo ÷ total × 100', meta: '≥ 95%', unidade: '%', direcao: 'maior', periodicidade: 'mensal' },
      { nome: 'Economia em compras', formula: '(Orçado − contratado) ÷ orçado × 100', meta: '≥ 3% ao ano', unidade: '%', direcao: 'maior', periodicidade: 'mensal' },
      { nome: '% compras emergenciais', formula: 'Pedidos emergenciais ÷ total × 100', meta: '≤ 5%', unidade: '%', direcao: 'menor', periodicidade: 'mensal' },
      { nome: 'Índice de desempenho de fornecedores', formula: 'Média de OTD, qualidade e atendimento', meta: 'nota ≥ 8,0 e OTD ≥ 95%', direcao: 'maior', periodicidade: 'mensal' },
    ],
  },
  {
    setor: 'Orçamentos', responsavel: 'Fernanda Scaramboni',
    indicadores: [
      { nome: 'Tempo de orçamento — incorporação', formula: 'Média de dias da solicitação à entrega', meta: '≤ 30 dias', unidade: 'dias', direcao: 'menor', periodicidade: 'mensal' },
      { nome: 'Tempo de orçamento — obra', formula: 'Média de dias para orçamentos de execução', meta: '≤ 30 dias', unidade: 'dias', direcao: 'menor', periodicidade: 'mensal' },
      { nome: 'Tempo de orçamento — Justfix simples', formula: 'Média de dias (serviços simples)', meta: '≤ 5 dias para 90%', unidade: 'dias', direcao: 'menor', periodicidade: 'mensal' },
      { nome: 'Tempo de orçamento — Justfix complexas', formula: 'Média de dias (serviços complexos)', meta: '≤ 10 dias para 90%', unidade: 'dias', direcao: 'menor', periodicidade: 'mensal' },
    ],
  },
  {
    setor: 'Personalização', responsavel: 'Personalização',
    indicadores: [
      { nome: 'VGV em vendas de personalização', formula: 'R$ VGV de personalização por empreendimento', meta: 'definir por empreendimento', unidade: 'R$', direcao: 'maior', periodicidade: 'mensal' },
      { nome: 'Ticket médio de personalização', formula: 'VGV personalizações ÷ nº unidades personalizadas', meta: '≥ R$ 10.000', unidade: 'R$', direcao: 'maior', periodicidade: 'mensal' },
      { nome: 'Tempo de atendimento', formula: 'Média de horas até o primeiro contato', meta: '90% em ≤ 24h úteis', unidade: 'horas', direcao: 'menor', periodicidade: 'mensal' },
      { nome: 'Tempo de retorno do cliente', formula: 'Média de dias da proposta à decisão', meta: '≤ 5 dias para 80%', unidade: 'dias', direcao: 'menor', periodicidade: 'mensal' },
    ],
  },
  {
    setor: 'Comercial', responsavel: 'Rodrigo Bertocco',
    indicadores: [
      { nome: 'Valor de vendas por mês', formula: 'R$ VGV contratado no mês', meta: '≥ meta mensal por empreendimento', unidade: 'R$', direcao: 'maior', periodicidade: 'mensal' },
      { nome: 'Leads gerados por mês', formula: 'Nº de leads novos registrados no mês', meta: '≥ meta de leads/mês por canal', unidade: 'leads', direcao: 'maior', periodicidade: 'mensal' },
      { nome: 'Taxa de conversão', formula: 'Vendas ÷ leads qualificados × 100', meta: '≥ 12%', unidade: '%', direcao: 'maior', periodicidade: 'mensal' },
      { nome: 'Canal de captação do lead', formula: '% de vendas por canal', meta: 'Digital + Plantão ≥ 60%', unidade: '%', direcao: 'maior', periodicidade: 'mensal' },
    ],
  },
  {
    setor: 'Pós-entrega', responsavel: 'Amanda da Cruz',
    indicadores: [
      { nome: 'Tempo de primeira resposta', formula: 'Média de horas até o 1º retorno humano', meta: '90% em ≤ 8h úteis', unidade: 'horas', direcao: 'menor', periodicidade: 'mensal' },
      { nome: 'NPS pós-visita', formula: 'Nota média em pesquisa rápida pós-visita', meta: '≥ 4,5 / 5', direcao: 'maior', periodicidade: 'mensal' },
      { nome: 'Custo de garantia sobre receita', formula: 'Custo de pós-obra ÷ receita de unidades × 100', meta: '≤ 2% da receita', unidade: '%', direcao: 'menor', periodicidade: 'mensal' },
      { nome: 'Manutenções por unidade', formula: 'Nº chamados ÷ nº unidades entregues', meta: '≤ 1 por unidade', direcao: 'menor', periodicidade: 'mensal' },
    ],
  },
  {
    setor: 'Planejamento', responsavel: 'Márcio / João',
    indicadores: [
      { nome: 'Orçado x Realizado', formula: 'Desvio entre medido e orçado nos contratos', meta: 'dentro do plano', unidade: '%', direcao: 'menor', periodicidade: 'mensal' },
      { nome: 'Pacotes imprevistos', formula: 'Nº de pacotes não planejados executados', meta: 'reduzir', unidade: 'ocorrências', direcao: 'menor', periodicidade: 'mensal' },
    ],
  },
];

async function main() {
  let criados = 0, atualizados = 0;
  for (const grupo of CATALOGO) {
    for (const ind of grupo.indicadores) {
      const existente = await prisma.indicador.findFirst({ where: { nome: ind.nome, setor: grupo.setor }, select: { id: true } });
      const data = {
        nome: ind.nome,
        setor: grupo.setor,
        responsavel: grupo.responsavel,
        cargo_alvo: grupo.cargo_alvo ?? null,
        formula: ind.formula ?? null,
        meta: ind.meta ?? null,
        unidade: ind.unidade ?? null,
        direcao: ind.direcao ?? 'maior',
        periodicidade: ind.periodicidade ?? null,
        ativo: true,
      };
      if (existente) { await prisma.indicador.update({ where: { id: existente.id }, data }); atualizados++; }
      else { await prisma.indicador.create({ data }); criados++; }
    }
  }
  const total = await prisma.indicador.count();
  console.log(`Indicadores PEJ: ${criados} criados, ${atualizados} atualizados. Total no catálogo: ${total}.`);
  await prisma.$disconnect();
}

main().catch(async (e) => { console.error(e); await prisma.$disconnect(); process.exit(1); });
