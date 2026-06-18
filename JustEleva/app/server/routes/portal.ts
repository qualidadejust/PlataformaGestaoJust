import { Router } from 'express';
import { prisma } from '../lib/prisma.js';

export const portalRouter = Router();

// Portal do avaliador (link mágico, sem senha): devolve a fila de avaliações do avaliador no ciclo do token.
portalRouter.get('/:token', async (req, res) => {
  const access = await prisma.accessToken.findUnique({
    where: { token: req.params.token },
    include: {
      employee: { select: { id: true, name: true, role: true } },
      cycle: { select: { id: true, name: true, end_date: true } },
      movimentacao: { select: { id: true, cargo_pretendido: true, employee: { select: { name: true } } } },
    },
  });
  if (!access) return res.status(404).json({ error: 'Link inválido' });
  if (access.expires_at && access.expires_at.getTime() < Date.now()) {
    return res.status(410).json({ error: 'Link expirado' });
  }

  const evals = await prisma.evaluation.findMany({
    where: {
      evaluator_id: access.employee_id,
      ...(access.movimentacao_id
        ? { movimentacao_id: access.movimentacao_id }
        : access.cycle_id
        ? { cycle_id: access.cycle_id }
        : { status: { in: ['pending', 'draft'] } }),
    },
    include: {
      employee: { select: { name: true, role: true } },
      obra: { select: { nome: true } },
    },
    orderBy: [{ status: 'asc' }, { created_at: 'asc' }],
  });

  const titulo = access.movimentacao
    ? `Movimentação · ${access.movimentacao.employee.name}`
    : access.cycle?.name ?? 'Minhas avaliações';

  res.json({
    evaluator: access.employee,
    titulo,
    evaluations: evals.map(e => ({
      id: e.id,
      employee_name: e.employee.name,
      employee_role: e.employee.role,
      obra_nome: e.obra?.nome ?? null,
      status: e.status,
    })),
  });
});
