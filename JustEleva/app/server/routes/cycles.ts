import { Router } from 'express';
import { randomUUID } from 'crypto';
import { prisma } from '../lib/prisma.js';

export const cyclesRouter = Router();

cyclesRouter.get('/', async (_req, res) => {
  const cycles = await prisma.cycle.findMany({ orderBy: { start_date: 'desc' } });
  res.json(cycles);
});

cyclesRouter.get('/:id', async (req, res) => {
  const cycle = await prisma.cycle.findUnique({ where: { id: req.params.id } });
  if (!cycle) return res.status(404).json({ error: 'Ciclo não encontrado' });
  res.json(cycle);
});

cyclesRouter.post('/', async (req, res) => {
  const { name, start_date, end_date, status } = req.body;
  if (!name || !start_date || !end_date) return res.status(400).json({ error: 'name, start_date e end_date são obrigatórios' });
  const cycle = await prisma.cycle.create({ data: { name, start_date, end_date, status: status ?? 'active' } });
  res.status(201).json(cycle);
});

cyclesRouter.put('/:id', async (req, res) => {
  const existing = await prisma.cycle.findUnique({ where: { id: req.params.id }, select: { id: true } });
  if (!existing) return res.status(404).json({ error: 'Ciclo não encontrado' });
  const { name, start_date, end_date, status } = req.body;
  const cycle = await prisma.cycle.update({ where: { id: req.params.id }, data: { name, start_date, end_date, status } });
  res.json(cycle);
});

// Gera as avaliações periódicas do ciclo a partir das alocações nas obras.
// Regra: mão de obra → mestre responsável da obra; mestre → residente responsável; residente → Diretor de Obras.
// Idempotente: não duplica avaliações já existentes (mesmo colaborador + ciclo + type 'periodica').
cyclesRouter.post('/:id/generate', async (req, res) => {
  const cycle = await prisma.cycle.findUnique({ where: { id: req.params.id } });
  if (!cycle) return res.status(404).json({ error: 'Ciclo não encontrado' });

  const obras = await prisma.obra.findMany({
    where: { tipo: 'obra' },
    include: { alocacoes: { include: { employee: { select: { id: true, name: true } } } } },
  });

  const diretor = await prisma.employee.findFirst({ where: { role: { contains: 'Diretor' } }, select: { id: true } });

  let criadas = 0;
  let ja_existiam = 0;
  const avisos: string[] = [];
  const addAviso = (msg: string) => { if (!avisos.includes(msg)) avisos.push(msg); };

  for (const obra of obras) {
    const mestreResp = obra.alocacoes.find(a => a.papel_na_obra === 'mestre' && a.responsavel);
    const residenteResp = obra.alocacoes.find(a => a.papel_na_obra === 'residente' && a.responsavel);

    for (const a of obra.alocacoes) {
      if (!a.principal) continue; // gera só na obra principal de cada colaborador

      let evaluatorId: string | null = null;
      if (a.papel_na_obra === 'mao_de_obra') {
        if (!mestreResp) { addAviso(`${obra.nome}: defina o mestre responsável pela avaliação (mão de obra sem avaliador).`); continue; }
        evaluatorId = mestreResp.employee_id;
      } else if (a.papel_na_obra === 'mestre') {
        if (!residenteResp) { addAviso(`${obra.nome}: defina o engenheiro residente responsável (mestres sem avaliador).`); continue; }
        evaluatorId = residenteResp.employee_id;
      } else if (a.papel_na_obra === 'residente') {
        if (!diretor) { addAviso(`Nenhum Diretor de Obras cadastrado para avaliar o residente.`); continue; }
        evaluatorId = diretor.id;
      } else {
        continue; // administrativo não entra no ciclo de obra
      }

      if (evaluatorId === a.employee_id) continue; // ninguém avalia a si mesmo

      const existente = await prisma.evaluation.findFirst({
        where: { employee_id: a.employee_id, cycle_id: cycle.id, type: 'periodica' },
        select: { id: true },
      });
      if (existente) { ja_existiam++; continue; }

      await prisma.evaluation.create({
        data: {
          employee_id: a.employee_id,
          evaluator_id: evaluatorId,
          cycle_id: cycle.id,
          obra_id: obra.id,
          type: 'periodica',
          origem: 'auto',
          status: 'pending',
          due_date: cycle.end_date,
        },
      });
      criadas++;
    }
  }

  res.json({ criadas, ja_existiam, avisos });
});

// Cria/recupera os links mágicos por avaliador do ciclo (para disparo via WhatsApp).
// Idempotente: reusa o token existente de cada avaliador. Retorna a fila de cada um.
cyclesRouter.post('/:id/access-tokens', async (req, res) => {
  const cycle = await prisma.cycle.findUnique({ where: { id: req.params.id }, select: { id: true } });
  if (!cycle) return res.status(404).json({ error: 'Ciclo não encontrado' });

  const evals = await prisma.evaluation.findMany({
    where: { cycle_id: cycle.id, evaluator_id: { not: null } },
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
    const access = await prisma.accessToken.upsert({
      where: { employee_id_cycle_id: { employee_id: evaluator_id, cycle_id: cycle.id } },
      update: {},
      create: { token: randomUUID(), employee_id: evaluator_id, cycle_id: cycle.id },
      include: { employee: { select: { id: true, name: true, role: true, phone: true } } },
    });
    result.push({
      evaluator_id,
      evaluator_name: access.employee.name,
      evaluator_role: access.employee.role,
      phone: access.employee.phone ?? null,
      token: access.token,
      total: s.total,
      pendentes: s.pendentes,
    });
  }
  result.sort((a, b) => b.pendentes - a.pendentes);
  res.json(result);
});

cyclesRouter.delete('/:id', async (req, res) => {
  const existing = await prisma.cycle.findUnique({ where: { id: req.params.id }, select: { id: true } });
  if (!existing) return res.status(404).json({ error: 'Ciclo não encontrado' });
  await prisma.cycle.delete({ where: { id: req.params.id } });
  res.status(204).send();
});
