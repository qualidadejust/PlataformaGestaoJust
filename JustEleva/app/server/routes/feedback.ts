import { Router } from 'express';
import { prisma } from '../lib/prisma.js';

export const feedbackRouter = Router();

feedbackRouter.get('/', async (req, res) => {
  const { to_employee_id, from_employee_id } = req.query;
  const where: Record<string, string> = {};
  if (to_employee_id)   where.to_employee_id   = to_employee_id as string;
  if (from_employee_id) where.from_employee_id = from_employee_id as string;

  const feedbacks = await prisma.feedback.findMany({
    where,
    include: {
      from_employee: { select: { name: true, role: true } },
      to_employee:   { select: { name: true, role: true } },
    },
    orderBy: { created_at: 'desc' },
  });

  res.json(feedbacks.map(f => ({
    ...f,
    from_name: f.from_employee.name,
    from_role: f.from_employee.role,
    to_name:   f.to_employee.name,
    to_role:   f.to_employee.role,
    from_employee: undefined,
    to_employee:   undefined,
  })));
});

feedbackRouter.post('/', async (req, res) => {
  const { from_employee_id, to_employee_id, evaluation_id, content, type } = req.body;
  if (!from_employee_id || !to_employee_id || !content)
    return res.status(400).json({ error: 'from_employee_id, to_employee_id e content são obrigatórios' });

  const feedback = await prisma.feedback.create({
    data: { from_employee_id, to_employee_id, evaluation_id: evaluation_id ?? null, content, type: type ?? 'recognition' },
  });
  res.status(201).json(feedback);
});

feedbackRouter.delete('/:id', async (req, res) => {
  const existing = await prisma.feedback.findUnique({ where: { id: req.params.id }, select: { id: true } });
  if (!existing) return res.status(404).json({ error: 'Feedback não encontrado' });
  await prisma.feedback.delete({ where: { id: req.params.id } });
  res.status(204).send();
});
