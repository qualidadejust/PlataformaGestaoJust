import { Router } from 'express';
import { randomUUID } from 'crypto';
import { prisma } from '../lib/prisma.js';

export const movimentacoesRouter = Router();

const DONE = ['submitted', 'completed'];

function resumoBanca(evals: { status: string }[]) {
  const total = evals.length;
  const concluidas = evals.filter(e => DONE.includes(e.status)).length;
  return { banca_total: total, banca_concluidas: concluidas };
}

// Lista de movimentações com progresso da banca
movimentacoesRouter.get('/', async (_req, res) => {
  const movs = await prisma.movimentacao.findMany({
    orderBy: { created_at: 'desc' },
    include: {
      employee: { select: { name: true, role: true } },
      evaluations: { select: { status: true } },
    },
  });
  res.json(movs.map(({ evaluations, employee, ...m }) => ({
    ...m,
    employee_name: employee.name,
    employee_role: employee.role,
    ...resumoBanca(evaluations),
  })));
});

// Detalhe com a banca (avaliadores + status)
movimentacoesRouter.get('/:id', async (req, res) => {
  const mov = await prisma.movimentacao.findUnique({
    where: { id: req.params.id },
    include: {
      employee: { select: { id: true, name: true, role: true } },
      evaluations: {
        include: { evaluator: { select: { id: true, name: true, role: true } } },
        orderBy: { created_at: 'asc' },
      },
    },
  });
  if (!mov) return res.status(404).json({ error: 'Movimentação não encontrada' });
  const { evaluations, ...rest } = mov;
  res.json({
    ...rest,
    banca: evaluations.map(e => ({
      evaluation_id: e.id,
      evaluator_id: e.evaluator_id,
      evaluator_name: e.evaluator?.name ?? null,
      evaluator_role: e.evaluator?.role ?? null,
      status: e.status,
    })),
  });
});

movimentacoesRouter.post('/', async (req, res) => {
  const { employee_id, tipo, cargo_pretendido, cargo_atual, motivo } = req.body;
  if (!employee_id) return res.status(400).json({ error: 'employee_id é obrigatório' });
  const emp = await prisma.employee.findUnique({ where: { id: employee_id }, select: { role: true } });
  if (!emp) return res.status(404).json({ error: 'Colaborador não encontrado' });
  const atual = cargo_atual ?? emp.role;
  const t = tipo === 'aumento' ? 'aumento' : 'promocao';
  // aumento salarial mantém o mesmo cargo; promoção exige o cargo pretendido
  const pretendido = t === 'aumento' ? atual : (cargo_pretendido?.trim() || atual);
  const mov = await prisma.movimentacao.create({
    data: { employee_id, tipo: t, cargo_pretendido: pretendido, cargo_atual: atual, motivo: motivo ?? null },
  });
  res.status(201).json(mov);
});

// Atualiza status / registra decisão
movimentacoesRouter.put('/:id', async (req, res) => {
  const existing = await prisma.movimentacao.findUnique({ where: { id: req.params.id }, select: { id: true } });
  if (!existing) return res.status(404).json({ error: 'Movimentação não encontrada' });
  const { status, decisao, justificativa } = req.body;
  const mov = await prisma.movimentacao.update({
    where: { id: req.params.id },
    data: {
      ...(status !== undefined && { status }),
      ...(decisao !== undefined && { decisao }),
      ...(justificativa !== undefined && { justificativa }),
      ...(decisao ? { status: 'concluida', decided_at: new Date() } : {}),
    },
  });
  res.json(mov);
});

movimentacoesRouter.delete('/:id', async (req, res) => {
  const existing = await prisma.movimentacao.findUnique({ where: { id: req.params.id }, select: { id: true } });
  if (!existing) return res.status(404).json({ error: 'Movimentação não encontrada' });
  await prisma.movimentacao.delete({ where: { id: req.params.id } });
  res.status(204).send();
});

// Adiciona um avaliador à banca (cria a avaliação de movimentação)
movimentacoesRouter.post('/:id/banca', async (req, res) => {
  const mov = await prisma.movimentacao.findUnique({ where: { id: req.params.id } });
  if (!mov) return res.status(404).json({ error: 'Movimentação não encontrada' });
  const { evaluator_id } = req.body;
  if (!evaluator_id) return res.status(400).json({ error: 'evaluator_id é obrigatório' });
  if (evaluator_id === mov.employee_id) return res.status(400).json({ error: 'O próprio colaborador não pode compor a banca' });

  const ja = await prisma.evaluation.findFirst({
    where: { movimentacao_id: mov.id, evaluator_id },
    select: { id: true },
  });
  if (ja) return res.status(409).json({ error: 'Avaliador já está na banca' });

  const evaluation = await prisma.evaluation.create({
    data: {
      employee_id: mov.employee_id,
      evaluator_id,
      movimentacao_id: mov.id,
      type: 'movimentacao',
      origem: 'manual',
      status: 'pending',
    },
    include: { evaluator: { select: { id: true, name: true, role: true } } },
  });
  res.status(201).json(evaluation);
});

// Remove um avaliador da banca
movimentacoesRouter.delete('/:id/banca/:evaluationId', async (req, res) => {
  const existing = await prisma.evaluation.findFirst({
    where: { id: req.params.evaluationId, movimentacao_id: req.params.id },
    select: { id: true },
  });
  if (!existing) return res.status(404).json({ error: 'Avaliação da banca não encontrada' });
  await prisma.evaluation.delete({ where: { id: existing.id } });
  res.status(204).send();
});

// Cria/recupera os links mágicos da banca (disparo WhatsApp) e marca em coleta
movimentacoesRouter.post('/:id/access-tokens', async (req, res) => {
  const mov = await prisma.movimentacao.findUnique({ where: { id: req.params.id }, select: { id: true } });
  if (!mov) return res.status(404).json({ error: 'Movimentação não encontrada' });

  const evals = await prisma.evaluation.findMany({
    where: { movimentacao_id: mov.id, evaluator_id: { not: null } },
    select: { evaluator_id: true, status: true },
  });
  if (evals.length === 0) return res.json([]);

  const stats = new Map<string, { total: number; pendentes: number }>();
  for (const e of evals) {
    const id = e.evaluator_id as string;
    const s = stats.get(id) ?? { total: 0, pendentes: 0 };
    s.total++;
    if (e.status === 'pending' || e.status === 'draft') s.pendentes++;
    stats.set(id, s);
  }

  const result = [];
  for (const [evaluator_id, s] of stats) {
    let access = await prisma.accessToken.findFirst({ where: { employee_id: evaluator_id, movimentacao_id: mov.id } });
    if (!access) {
      access = await prisma.accessToken.create({ data: { token: randomUUID(), employee_id: evaluator_id, movimentacao_id: mov.id } });
    }
    const ev = await prisma.employee.findUnique({ where: { id: evaluator_id }, select: { name: true, role: true, phone: true } });
    result.push({
      evaluator_id,
      evaluator_name: ev?.name ?? '',
      evaluator_role: ev?.role ?? '',
      phone: ev?.phone ?? null,
      token: access.token,
      total: s.total,
      pendentes: s.pendentes,
    });
  }
  await prisma.movimentacao.update({ where: { id: mov.id }, data: { status: 'em_coleta' } });
  result.sort((a, b) => b.pendentes - a.pendentes);
  res.json(result);
});
