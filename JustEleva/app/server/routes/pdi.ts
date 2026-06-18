import { Router } from 'express';
import { prisma } from '../lib/prisma.js';

export const pdiRouter = Router();

const PLAN_INCLUDE = {
  employee: { select: { name: true, role: true } },
  cycle:    { select: { name: true } },
  actions:  { orderBy: { deadline: 'asc' as const } },
} as const;

function flattenPlan(p: any) {
  const { employee, cycle, ...rest } = p;
  return { ...rest, employee_name: employee?.name, employee_role: employee?.role, cycle_name: cycle?.name };
}

pdiRouter.get('/', async (req, res) => {
  const { employee_id } = req.query;
  const plans = await prisma.pdiPlan.findMany({
    where: employee_id ? { employee_id: employee_id as string } : undefined,
    include: PLAN_INCLUDE,
    orderBy: { created_at: 'desc' },
  });
  res.json(plans.map(flattenPlan));
});

pdiRouter.get('/:id', async (req, res) => {
  const plan = await prisma.pdiPlan.findUnique({ where: { id: req.params.id }, include: PLAN_INCLUDE });
  if (!plan) return res.status(404).json({ error: 'PDI não encontrado' });
  res.json(flattenPlan(plan));
});

pdiRouter.post('/', async (req, res) => {
  const { employee_id, cycle_id, actions } = req.body;
  if (!employee_id || !cycle_id) return res.status(400).json({ error: 'employee_id e cycle_id são obrigatórios' });

  const cycleExists = await prisma.cycle.findUnique({ where: { id: cycle_id }, select: { id: true } });
  if (!cycleExists) return res.status(400).json({ error: 'Ciclo não encontrado' });

  const plan = await prisma.pdiPlan.create({
    data: {
      employee_id,
      cycle_id,
      actions: {
        create: Array.isArray(actions) ? actions.map((a: any) => ({
          title:              a.title,
          description:        a.description,
          status:             a.status ?? 'pending',
          deadline:           a.deadline,
          resources_needed:   a.resources_needed   ?? null,
          expected_outcomes:  a.expected_outcomes  ?? null,
          related_competency: a.related_competency ?? null,
          action_type:        a.action_type        ?? null,
        })) : [],
      },
    },
    include: PLAN_INCLUDE,
  });
  res.status(201).json(flattenPlan(plan));
});

pdiRouter.post('/:id/actions', async (req, res) => {
  const plan = await prisma.pdiPlan.findUnique({ where: { id: req.params.id }, select: { id: true } });
  if (!plan) return res.status(404).json({ error: 'PDI não encontrado' });

  const { title, description, status, deadline, resources_needed, expected_outcomes, related_competency, action_type } = req.body;
  if (!title || !description || !deadline) return res.status(400).json({ error: 'title, description e deadline são obrigatórios' });

  const action = await prisma.pdiAction.create({
    data: {
      pdi_plan_id: req.params.id,
      title, description,
      status:             status             ?? 'pending',
      deadline,
      resources_needed:   resources_needed   ?? null,
      expected_outcomes:  expected_outcomes  ?? null,
      related_competency: related_competency ?? null,
      action_type:        action_type        ?? null,
    },
  });
  res.status(201).json(action);
});

pdiRouter.put('/:id/actions/:actionId', async (req, res) => {
  const action = await prisma.pdiAction.findFirst({
    where: { id: req.params.actionId, pdi_plan_id: req.params.id },
    select: { id: true },
  });
  if (!action) return res.status(404).json({ error: 'Ação não encontrada' });

  const { title, description, status, deadline, resources_needed, expected_outcomes, related_competency, action_type } = req.body;
  const updated = await prisma.pdiAction.update({
    where: { id: req.params.actionId },
    data: { title, description, status, deadline, resources_needed, expected_outcomes, related_competency, action_type },
  });
  res.json(updated);
});

pdiRouter.delete('/:id', async (req, res) => {
  const existing = await prisma.pdiPlan.findUnique({ where: { id: req.params.id }, select: { id: true } });
  if (!existing) return res.status(404).json({ error: 'PDI não encontrado' });
  await prisma.pdiPlan.delete({ where: { id: req.params.id } });
  res.status(204).send();
});
