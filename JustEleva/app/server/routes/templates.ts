import { Router } from 'express';
import { prisma } from '../lib/prisma.js';

export const templatesRouter = Router();

const includeTree = {
  blocks: {
    orderBy: { sort_order: 'asc' as const },
    include: {
      questions: { orderBy: { sort_order: 'asc' as const } },
    },
  },
};

type BlockInput = {
  title: string;
  manager_only?: boolean;
  questions?: { text: string; answer_type?: string }[];
};

const ANSWER_TYPES = ['scale', 'yesno', 'text'];

async function replaceBlocks(tx: any, templateId: string, blocks: BlockInput[]) {
  await tx.evaluationBlock.deleteMany({ where: { template_id: templateId } });
  for (let bi = 0; bi < blocks.length; bi++) {
    const block = blocks[bi];
    const created = await tx.evaluationBlock.create({
      data: {
        template_id: templateId,
        title: block.title,
        sort_order: bi,
        manager_only: !!block.manager_only,
      },
    });
    const questions = block.questions ?? [];
    for (let qi = 0; qi < questions.length; qi++) {
      const answer_type = ANSWER_TYPES.includes(questions[qi].answer_type ?? '') ? questions[qi].answer_type! : 'scale';
      await tx.templateQuestion.create({
        data: { block_id: created.id, text: questions[qi].text, answer_type, sort_order: qi },
      });
    }
  }
}

templatesRouter.get('/', async (_req, res) => {
  const templates = await prisma.evaluationTemplate.findMany({
    include: includeTree,
    orderBy: { created_at: 'asc' },
  });
  res.json(templates);
});

templatesRouter.get('/:id', async (req, res) => {
  const template = await prisma.evaluationTemplate.findUnique({
    where: { id: req.params.id },
    include: includeTree,
  });
  if (!template) return res.status(404).json({ error: 'Modelo não encontrado' });
  res.json(template);
});

templatesRouter.post('/', async (req, res) => {
  const { name, description, applies_to, scale_max, blocks } = req.body;
  if (!name) return res.status(400).json({ error: 'name é obrigatório' });

  const template = await prisma.$transaction(async (tx) => {
    const created = await tx.evaluationTemplate.create({
      data: {
        name,
        description: description ?? null,
        applies_to: applies_to === 'managers' ? 'managers' : 'default',
        scale_max: scale_max ?? 5,
      },
    });
    if (Array.isArray(blocks)) await replaceBlocks(tx, created.id, blocks);
    return tx.evaluationTemplate.findUnique({ where: { id: created.id }, include: includeTree });
  });

  res.status(201).json(template);
});

templatesRouter.put('/:id', async (req, res) => {
  const existing = await prisma.evaluationTemplate.findUnique({ where: { id: req.params.id }, select: { id: true } });
  if (!existing) return res.status(404).json({ error: 'Modelo não encontrado' });
  const { name, description, applies_to, scale_max, is_active, blocks } = req.body;

  const template = await prisma.$transaction(async (tx) => {
    await tx.evaluationTemplate.update({
      where: { id: req.params.id },
      data: {
        ...(name !== undefined && { name }),
        ...(description !== undefined && { description }),
        ...(applies_to !== undefined && { applies_to: applies_to === 'managers' ? 'managers' : 'default' }),
        ...(scale_max !== undefined && { scale_max }),
        ...(is_active !== undefined && { is_active: !!is_active }),
      },
    });
    if (Array.isArray(blocks)) await replaceBlocks(tx, req.params.id, blocks);
    return tx.evaluationTemplate.findUnique({ where: { id: req.params.id }, include: includeTree });
  });

  res.json(template);
});

templatesRouter.delete('/:id', async (req, res) => {
  const existing = await prisma.evaluationTemplate.findUnique({ where: { id: req.params.id }, select: { id: true } });
  if (!existing) return res.status(404).json({ error: 'Modelo não encontrado' });
  // Libera colaboradores atribuídos antes de remover (FK SetNull já cobre, mas explícito é mais seguro)
  await prisma.employee.updateMany({ where: { template_id: req.params.id }, data: { template_id: null } });
  await prisma.evaluationTemplate.delete({ where: { id: req.params.id } });
  res.status(204).send();
});
