import { Router } from 'express';
import { prisma } from '../lib/prisma.js';

export const alocacoesRouter = Router();

alocacoesRouter.put('/:id', async (req, res) => {
  const existing = await prisma.alocacao.findUnique({ where: { id: req.params.id }, select: { id: true } });
  if (!existing) return res.status(404).json({ error: 'Alocação não encontrada' });
  const { papel_na_obra, principal, responsavel, data_inicio, data_fim } = req.body;
  const alocacao = await prisma.alocacao.update({
    where: { id: req.params.id },
    data: {
      papel_na_obra,
      principal: principal === undefined ? undefined : !!principal,
      responsavel: responsavel === undefined ? undefined : !!responsavel,
      data_inicio: data_inicio === undefined ? undefined : (data_inicio || null),
      data_fim: data_fim === undefined ? undefined : (data_fim || null),
    },
    include: { employee: { select: { id: true, name: true, role: true, department: true } } },
  });
  res.json(alocacao);
});

alocacoesRouter.delete('/:id', async (req, res) => {
  const existing = await prisma.alocacao.findUnique({ where: { id: req.params.id }, select: { id: true } });
  if (!existing) return res.status(404).json({ error: 'Alocação não encontrada' });
  await prisma.alocacao.delete({ where: { id: req.params.id } });
  res.status(204).send();
});
