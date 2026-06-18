/**
 * Template dedicado da avaliação de MOVIMENTAÇÃO (prontidão para o cargo).
 * Curto e baseado em comportamento observável — respondido pela banca.
 * applies_to = 'movimentacao' (resolvido por tipo da avaliação, não pelo cargo).
 *
 * Rodar: npx tsx prisma/seed-movimentacao-template.ts  (idempotente)
 */
import { prisma } from '../server/lib/prisma.js';

const TEMPLATE_ID = 'tpl-movimentacao';

const BLOCOS = [
  {
    title: 'Prontidão para o cargo',
    questions: [
      { text: 'Entrega o trabalho atual no padrão de qualidade esperado, com consistência.', answer_type: 'scale' },
      { text: 'É confiável: cumpre prazos, combinados e horários sem precisar de cobrança constante.', answer_type: 'scale' },
      { text: 'Zela pela segurança (EPIs e procedimentos) e pelo bom uso de materiais e ferramentas.', answer_type: 'scale' },
      { text: 'Já demonstra, na prática, as competências técnicas exigidas pelo cargo pretendido.', answer_type: 'scale' },
      { text: 'Resolve problemas e atua com a autonomia que o novo cargo vai exigir.', answer_type: 'scale' },
      { text: 'Tem boa relação com a equipe e contribui para um ambiente colaborativo e de respeito.', answer_type: 'scale' },
      { text: 'Se o novo cargo envolve liderança: orienta e organiza colegas de forma respeitosa e eficaz (use N/S se não se aplica).', answer_type: 'scale' },
    ],
  },
  {
    title: 'Recomendação',
    questions: [
      { text: 'Você recomenda a movimentação deste colaborador para o cargo pretendido?', answer_type: 'yesno' },
      { text: 'Justifique: pontos fortes que sustentam a indicação e o que ainda precisa desenvolver.', answer_type: 'text' },
    ],
  },
];

async function main() {
  await prisma.evaluationTemplate.upsert({
    where: { id: TEMPLATE_ID },
    update: { name: 'Prontidão para Movimentação', applies_to: 'movimentacao', scale_max: 5, is_active: true },
    create: { id: TEMPLATE_ID, name: 'Prontidão para Movimentação', applies_to: 'movimentacao', scale_max: 5, is_active: true },
  });

  // recria blocos/perguntas (idempotente)
  await prisma.evaluationBlock.deleteMany({ where: { template_id: TEMPLATE_ID } });
  for (let bi = 0; bi < BLOCOS.length; bi++) {
    const b = BLOCOS[bi];
    const block = await prisma.evaluationBlock.create({
      data: { template_id: TEMPLATE_ID, title: b.title, sort_order: bi, manager_only: false },
    });
    for (let qi = 0; qi < b.questions.length; qi++) {
      await prisma.templateQuestion.create({
        data: { block_id: block.id, text: b.questions[qi].text, answer_type: b.questions[qi].answer_type, sort_order: qi },
      });
    }
  }

  const total = await prisma.templateQuestion.count({ where: { block: { template_id: TEMPLATE_ID } } });
  console.log(`Template de movimentação pronto: ${BLOCOS.length} blocos, ${total} perguntas.`);
  await prisma.$disconnect();
}

main().catch(async (e) => { console.error(e); await prisma.$disconnect(); process.exit(1); });
