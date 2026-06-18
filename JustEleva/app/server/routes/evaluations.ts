import { Router } from 'express';
import { prisma } from '../lib/prisma.js';

export const evaluationsRouter = Router();

function flattenEval(e: any) {
  const { employee, evaluator, cycle, obra, scores, potential_scores, ...rest } = e;
  let avg_score: number | null = null;
  if (scores && scores.length > 0) {
    const nums = scores.map((s: any) => parseFloat(s.score)).filter((n: number) => !isNaN(n));
    avg_score = nums.length > 0 ? Math.round((nums.reduce((a: number, b: number) => a + b, 0) / nums.length) * 10) / 10 : null;
  }
  let avg_potential: number | null = null;
  if (potential_scores && potential_scores.length > 0) {
    const nums = potential_scores.map((s: any) => Number(s.score)).filter((n: number) => !isNaN(n) && n > 0);
    avg_potential = nums.length > 0 ? Math.round((nums.reduce((a: number, b: number) => a + b, 0) / nums.length) * 10) / 10 : null;
  }
  return {
    ...rest,
    employee_name: employee?.name,
    employee_role: employee?.role,
    employee_department: employee?.department,
    is_manager:    employee?.is_manager,
    evaluator_name: evaluator?.name,
    cycle_name:    cycle?.name,
    obra_nome:     obra?.nome ?? null,
    avg_score,
    avg_potential,
  };
}

evaluationsRouter.get('/', async (req, res) => {
  const { cycle_id, employee_id, status, obra_id } = req.query;
  const where: Record<string, string> = {};
  if (cycle_id)    where.cycle_id    = cycle_id    as string;
  if (employee_id) where.employee_id = employee_id as string;
  if (status)      where.status      = status      as string;
  if (obra_id)     where.obra_id     = obra_id     as string;

  const evals = await prisma.evaluation.findMany({
    where,
    include: {
      employee: { select: { name: true, role: true, is_manager: true, department: true } },
      evaluator: { select: { name: true } },
      cycle:     { select: { name: true } },
      obra:      { select: { nome: true } },
      scores:          true,
      potential_scores: true,
    },
    orderBy: { created_at: 'desc' },
  });
  res.json(evals.map(flattenEval));
});

const templateTree = {
  blocks: {
    orderBy: { sort_order: 'asc' as const },
    include: { questions: { orderBy: { sort_order: 'asc' as const } } },
  },
};

// Resolve o modelo aplicável: override individual → modelo de lideranças → modelo padrão
async function resolveTemplate(templateId: string | null, isManager: boolean) {
  if (templateId) {
    const own = await prisma.evaluationTemplate.findUnique({ where: { id: templateId }, include: templateTree });
    if (own) return own;
  }
  if (isManager) {
    const mgr = await prisma.evaluationTemplate.findFirst({ where: { applies_to: 'managers', is_active: true }, include: templateTree, orderBy: { created_at: 'asc' } });
    if (mgr) return mgr;
  }
  return prisma.evaluationTemplate.findFirst({ where: { applies_to: 'default', is_active: true }, include: templateTree, orderBy: { created_at: 'asc' } });
}

evaluationsRouter.get('/:id', async (req, res) => {
  const eval_ = await prisma.evaluation.findUnique({
    where: { id: req.params.id },
    include: {
      employee: { select: { name: true, role: true, is_manager: true, template_id: true } },
      evaluator: { select: { name: true } },
      cycle:     { select: { name: true } },
      scores:          { select: { question_id: true, score: true } },
      potential_scores: { select: { question_id: true, score: true } },
    },
  });
  if (!eval_) return res.status(404).json({ error: 'Avaliação não encontrada' });

  const { employee, evaluator, cycle, scores, potential_scores, ...rest } = eval_;
  // Movimentação usa o template de prontidão (resolvido por tipo, não pelo cargo)
  const template = eval_.type === 'movimentacao'
    ? (await prisma.evaluationTemplate.findFirst({ where: { applies_to: 'movimentacao', is_active: true }, include: templateTree, orderBy: { created_at: 'asc' } })
       ?? await resolveTemplate(employee.template_id, employee.is_manager))
    : await resolveTemplate(employee.template_id, employee.is_manager);
  res.json({
    ...rest,
    employee_name:  employee.name,
    employee_role:  employee.role,
    is_manager:     employee.is_manager,
    evaluator_name: evaluator?.name ?? null,
    cycle_name:     cycle?.name ?? null,
    scores,
    potential_scores,
    template,
  });
});

evaluationsRouter.post('/', async (req, res) => {
  const { employee_id, evaluator_id, cycle_id, type, due_date } = req.body;
  if (!employee_id || !type) return res.status(400).json({ error: 'employee_id e type são obrigatórios' });
  const evaluation = await prisma.evaluation.create({
    data: { employee_id, evaluator_id: evaluator_id ?? null, cycle_id: cycle_id ?? null, type, due_date: due_date ?? null },
  });
  res.status(201).json(evaluation);
});

evaluationsRouter.put('/:id/scores', async (req, res) => {
  const { scores, potential_scores, status, strengths, opportunities, feedback_date } = req.body;

  await prisma.$transaction(async (tx) => {
    if (scores) {
      for (const [question_id, score] of Object.entries(scores)) {
        await tx.evaluationScore.upsert({
          where:  { evaluation_id_question_id: { evaluation_id: req.params.id, question_id } },
          update: { score: score as string },
          create: { evaluation_id: req.params.id, question_id, score: score as string },
        });
      }
    }
    if (potential_scores) {
      for (const [question_id, score] of Object.entries(potential_scores)) {
        await tx.potentialScore.upsert({
          where:  { evaluation_id_question_id: { evaluation_id: req.params.id, question_id } },
          update: { score: score as number },
          create: { evaluation_id: req.params.id, question_id, score: score as number },
        });
      }
    }
    const hasUpdate = status !== undefined || strengths !== undefined || opportunities !== undefined || feedback_date !== undefined;
    if (hasUpdate) {
      await tx.evaluation.update({
        where: { id: req.params.id },
        data: {
          ...(status        !== undefined && { status }),
          ...(strengths     !== undefined && { strengths }),
          ...(opportunities !== undefined && { opportunities }),
          ...(feedback_date !== undefined && { feedback_date }),
          ...(status === 'submitted'      && { submitted_at: new Date() }),
        },
      });
    }
  });

  res.json({ ok: true });
});

evaluationsRouter.put('/:id', async (req, res) => {
  const existing = await prisma.evaluation.findUnique({ where: { id: req.params.id }, select: { id: true } });
  if (!existing) return res.status(404).json({ error: 'Avaliação não encontrada' });
  const { status, due_date, evaluator_id } = req.body;
  const evaluation = await prisma.evaluation.update({
    where: { id: req.params.id },
    data: { status, due_date, evaluator_id },
  });
  res.json(evaluation);
});

evaluationsRouter.delete('/:id', async (req, res) => {
  const existing = await prisma.evaluation.findUnique({ where: { id: req.params.id }, select: { id: true } });
  if (!existing) return res.status(404).json({ error: 'Avaliação não encontrada' });
  await prisma.evaluation.delete({ where: { id: req.params.id } });
  res.status(204).send();
});
