import { Router } from 'express';
import { prisma } from '../lib/prisma.js';

export const employeesRouter = Router();

employeesRouter.get('/', async (_req, res) => {
  const employees = await prisma.employee.findMany({ orderBy: { name: 'asc' } });
  res.json(employees);
});

employeesRouter.get('/:id/performance', async (req, res) => {
  const employee = await prisma.employee.findUnique({ where: { id: req.params.id }, select: { id: true } });
  if (!employee) return res.status(404).json({ error: 'Colaborador não encontrado' });

  const rows = await prisma.$queryRaw<Record<string, unknown>[]>`
    SELECT
      e.id AS evaluation_id,
      e.type,
      e.status,
      c.id AS cycle_id,
      c.name AS cycle_name,
      c.start_date,
      ROUND(AVG(CAST(es.score AS FLOAT)), 2) AS avg_score,
      ROUND(AVG(CAST(ps.score AS FLOAT)), 2) AS avg_potential
    FROM evaluations e
    LEFT JOIN cycles c ON c.id = e.cycle_id
    LEFT JOIN evaluation_scores es ON es.evaluation_id = e.id AND es.score != 'NS'
    LEFT JOIN potential_scores ps ON ps.evaluation_id = e.id
    WHERE e.employee_id = ${req.params.id}
      AND e.status = 'submitted'
    GROUP BY e.id, c.id, c.name, c.start_date
    ORDER BY c.start_date ASC, e.type ASC
  `;

  res.json(rows);
});

employeesRouter.get('/:id', async (req, res) => {
  const employee = await prisma.employee.findUnique({ where: { id: req.params.id } });
  if (!employee) return res.status(404).json({ error: 'Colaborador não encontrado' });
  res.json(employee);
});

employeesRouter.post('/', async (req, res) => {
  const { name, role, department, email, phone, admission_date, avatar_url, is_manager } = req.body;
  if (!name || !role || !department) return res.status(400).json({ error: 'name, role e department são obrigatórios' });
  const employee = await prisma.employee.create({
    data: { name, role, department, email, phone, admission_date, avatar_url, is_manager: !!is_manager },
  });
  res.status(201).json(employee);
});

employeesRouter.put('/:id', async (req, res) => {
  const existing = await prisma.employee.findUnique({ where: { id: req.params.id }, select: { id: true } });
  if (!existing) return res.status(404).json({ error: 'Colaborador não encontrado' });
  const { name, role, department, email, phone, admission_date, avatar_url, is_manager } = req.body;
  const employee = await prisma.employee.update({
    where: { id: req.params.id },
    data: { name, role, department, email, phone, admission_date, avatar_url, is_manager: !!is_manager },
  });
  res.json(employee);
});

// Atribui (ou remove) o modelo de avaliação individual de um colaborador
employeesRouter.put('/:id/template', async (req, res) => {
  const existing = await prisma.employee.findUnique({ where: { id: req.params.id }, select: { id: true } });
  if (!existing) return res.status(404).json({ error: 'Colaborador não encontrado' });
  const { template_id } = req.body;
  const employee = await prisma.employee.update({
    where: { id: req.params.id },
    data: { template_id: template_id ?? null },
  });
  res.json(employee);
});

employeesRouter.delete('/:id', async (req, res) => {
  const existing = await prisma.employee.findUnique({ where: { id: req.params.id }, select: { id: true } });
  if (!existing) return res.status(404).json({ error: 'Colaborador não encontrado' });
  await prisma.employee.delete({ where: { id: req.params.id } });
  res.status(204).send();
});
