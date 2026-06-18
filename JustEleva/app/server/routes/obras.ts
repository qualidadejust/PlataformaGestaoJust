import { Router } from 'express';
import { prisma } from '../lib/prisma.js';

export const obrasRouter = Router();

// Lista de obras com contagem de alocados por papel
obrasRouter.get('/', async (_req, res) => {
  const obras = await prisma.obra.findMany({
    orderBy: [{ tipo: 'asc' }, { nome: 'asc' }],
    include: { alocacoes: { select: { papel_na_obra: true } } },
  });
  const result = obras.map(({ alocacoes, ...o }) => {
    const by_papel: Record<string, number> = {};
    for (const a of alocacoes) by_papel[a.papel_na_obra] = (by_papel[a.papel_na_obra] ?? 0) + 1;
    return { ...o, total_alocados: alocacoes.length, by_papel };
  });
  res.json(result);
});

// Detalhe de uma obra com as alocações (e dados do colaborador)
obrasRouter.get('/:id', async (req, res) => {
  const obra = await prisma.obra.findUnique({
    where: { id: req.params.id },
    include: {
      alocacoes: {
        orderBy: { papel_na_obra: 'asc' },
        include: { employee: { select: { id: true, name: true, role: true, department: true } } },
      },
    },
  });
  if (!obra) return res.status(404).json({ error: 'Obra não encontrada' });
  res.json(obra);
});

obrasRouter.post('/', async (req, res) => {
  const { nome, cost_center, tipo, status } = req.body;
  if (!nome) return res.status(400).json({ error: 'nome é obrigatório' });
  const obra = await prisma.obra.create({
    data: {
      nome,
      cost_center: cost_center || null,
      tipo: tipo ?? 'obra',
      status: status ?? 'ativa',
    },
  });
  res.status(201).json(obra);
});

obrasRouter.put('/:id', async (req, res) => {
  const existing = await prisma.obra.findUnique({ where: { id: req.params.id }, select: { id: true } });
  if (!existing) return res.status(404).json({ error: 'Obra não encontrada' });
  const { nome, cost_center, tipo, status } = req.body;
  const obra = await prisma.obra.update({
    where: { id: req.params.id },
    data: { nome, cost_center: cost_center || null, tipo, status },
  });
  res.json(obra);
});

obrasRouter.delete('/:id', async (req, res) => {
  const existing = await prisma.obra.findUnique({ where: { id: req.params.id }, select: { id: true } });
  if (!existing) return res.status(404).json({ error: 'Obra não encontrada' });
  await prisma.obra.delete({ where: { id: req.params.id } });
  res.status(204).send();
});

// Cria uma alocação de colaborador nesta obra
obrasRouter.post('/:id/alocacoes', async (req, res) => {
  const obra = await prisma.obra.findUnique({ where: { id: req.params.id }, select: { id: true } });
  if (!obra) return res.status(404).json({ error: 'Obra não encontrada' });
  const { employee_id, papel_na_obra, principal, data_inicio, data_fim } = req.body;
  if (!employee_id) return res.status(400).json({ error: 'employee_id é obrigatório' });
  const emp = await prisma.employee.findUnique({ where: { id: employee_id }, select: { id: true } });
  if (!emp) return res.status(404).json({ error: 'Colaborador não encontrado' });
  const alocacao = await prisma.alocacao.create({
    data: {
      employee_id,
      obra_id: req.params.id,
      papel_na_obra: papel_na_obra ?? 'mao_de_obra',
      principal: !!principal,
      data_inicio: data_inicio || null,
      data_fim: data_fim || null,
    },
    include: { employee: { select: { id: true, name: true, role: true, department: true } } },
  });
  res.status(201).json(alocacao);
});
