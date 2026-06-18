import { Router } from 'express';
import { prisma } from '../lib/prisma.js';

export const indicadoresRouter = Router();

// ---------- Atribuições (rotas específicas antes de /:id) ----------

// Lista atribuições; filtra por employee_id
indicadoresRouter.get('/atribuicoes', async (req, res) => {
  const { employee_id } = req.query;
  const atribuicoes = await prisma.indicadorAtribuicao.findMany({
    where: employee_id ? { employee_id: employee_id as string } : undefined,
    include: { indicador: true, employee: { select: { id: true, name: true, role: true } } },
    orderBy: { created_at: 'asc' },
  });
  res.json(atribuicoes);
});

indicadoresRouter.post('/atribuicoes', async (req, res) => {
  const { indicador_id, employee_id, meta, peso, fonte } = req.body;
  if (!indicador_id || !employee_id) return res.status(400).json({ error: 'indicador_id e employee_id são obrigatórios' });
  const ja = await prisma.indicadorAtribuicao.findUnique({ where: { indicador_id_employee_id: { indicador_id, employee_id } }, select: { id: true } });
  if (ja) return res.status(409).json({ error: 'Indicador já atribuído a esta pessoa' });
  const atribuicao = await prisma.indicadorAtribuicao.create({
    data: { indicador_id, employee_id, meta: meta || null, peso: peso ?? 1, fonte: fonte ?? 'avaliador' },
    include: { indicador: true },
  });
  res.status(201).json(atribuicao);
});

indicadoresRouter.put('/atribuicoes/:aid', async (req, res) => {
  const existing = await prisma.indicadorAtribuicao.findUnique({ where: { id: req.params.aid }, select: { id: true } });
  if (!existing) return res.status(404).json({ error: 'Atribuição não encontrada' });
  const { meta, peso, fonte } = req.body;
  const atribuicao = await prisma.indicadorAtribuicao.update({
    where: { id: req.params.aid },
    data: {
      meta: meta === undefined ? undefined : (meta || null),
      peso: peso === undefined ? undefined : peso,
      fonte: fonte === undefined ? undefined : fonte,
    },
    include: { indicador: true },
  });
  res.json(atribuicao);
});

indicadoresRouter.delete('/atribuicoes/:aid', async (req, res) => {
  const existing = await prisma.indicadorAtribuicao.findUnique({ where: { id: req.params.aid }, select: { id: true } });
  if (!existing) return res.status(404).json({ error: 'Atribuição não encontrada' });
  await prisma.indicadorAtribuicao.delete({ where: { id: req.params.aid } });
  res.status(204).send();
});

// ---------- Realizações (lançamento do realizado por período) ----------

// Lista realizações; filtra por indicador_id e/ou periodo
indicadoresRouter.get('/realizacoes', async (req, res) => {
  const { indicador_id, periodo } = req.query;
  const where: Record<string, string> = {};
  if (indicador_id) where.indicador_id = indicador_id as string;
  if (periodo) where.periodo = periodo as string;
  const realizacoes = await prisma.indicadorRealizacao.findMany({
    where: Object.keys(where).length ? where : undefined,
    include: { employee: { select: { id: true, name: true, role: true } } },
    orderBy: [{ periodo: 'desc' }, { created_at: 'desc' }],
  });
  res.json(realizacoes);
});

// Cria ou atualiza (upsert) a realização de um indicador num período (e opcionalmente de uma pessoa)
indicadoresRouter.post('/realizacoes', async (req, res) => {
  const { indicador_id, employee_id, periodo, valor, valor_num, observacao, evidencia_url, lancado_por } = req.body;
  if (!indicador_id || !periodo) return res.status(400).json({ error: 'indicador_id e periodo são obrigatórios' });
  const indicador = await prisma.indicador.findUnique({ where: { id: indicador_id }, select: { id: true } });
  if (!indicador) return res.status(404).json({ error: 'Indicador não encontrado' });
  const data = {
    valor: valor === undefined ? null : (valor || null),
    valor_num: valor_num === undefined || valor_num === null || valor_num === '' ? null : Number(valor_num),
    observacao: observacao || null,
    evidencia_url: evidencia_url || null,
    lancado_por: lancado_por || null,
  };
  // upsert manual: NULL em índice único do SQLite é distinto, então buscamos pela tripla antes
  const existing = await prisma.indicadorRealizacao.findFirst({
    where: { indicador_id, employee_id: employee_id || null, periodo },
    select: { id: true },
  });
  const realizacao = existing
    ? await prisma.indicadorRealizacao.update({
        where: { id: existing.id }, data,
        include: { employee: { select: { id: true, name: true, role: true } } },
      })
    : await prisma.indicadorRealizacao.create({
        data: { indicador_id, employee_id: employee_id || null, periodo, ...data },
        include: { employee: { select: { id: true, name: true, role: true } } },
      });
  res.status(201).json(realizacao);
});

indicadoresRouter.delete('/realizacoes/:rid', async (req, res) => {
  const existing = await prisma.indicadorRealizacao.findUnique({ where: { id: req.params.rid }, select: { id: true } });
  if (!existing) return res.status(404).json({ error: 'Realização não encontrada' });
  await prisma.indicadorRealizacao.delete({ where: { id: req.params.rid } });
  res.status(204).send();
});

// ---------- Catálogo ----------

indicadoresRouter.get('/', async (req, res) => {
  const { cargo, setor } = req.query;
  const where: Record<string, string> = {};
  if (cargo) where.cargo_alvo = cargo as string;
  if (setor) where.setor = setor as string;
  const indicadores = await prisma.indicador.findMany({
    where: Object.keys(where).length ? where : undefined,
    orderBy: [{ setor: 'asc' }, { nome: 'asc' }],
    include: { _count: { select: { atribuicoes: true } } },
  });
  res.json(indicadores.map(({ _count, ...i }) => ({ ...i, atribuicoes_count: _count.atribuicoes })));
});

indicadoresRouter.post('/', async (req, res) => {
  const { nome, descricao, unidade, direcao, cargo_alvo, setor, formula, meta, periodicidade, responsavel, acumula, ativo } = req.body;
  if (!nome) return res.status(400).json({ error: 'nome é obrigatório' });
  const indicador = await prisma.indicador.create({
    data: {
      nome,
      descricao: descricao || null,
      unidade: unidade || null,
      direcao: direcao === 'menor' ? 'menor' : 'maior',
      cargo_alvo: cargo_alvo || null,
      setor: setor || null,
      formula: formula || null,
      meta: meta || null,
      periodicidade: periodicidade || null,
      responsavel: responsavel || null,
      acumula: !!acumula,
      ativo: ativo === undefined ? true : !!ativo,
    },
  });
  res.status(201).json(indicador);
});

indicadoresRouter.get('/:id', async (req, res) => {
  const indicador = await prisma.indicador.findUnique({ where: { id: req.params.id } });
  if (!indicador) return res.status(404).json({ error: 'Indicador não encontrado' });
  res.json(indicador);
});

indicadoresRouter.put('/:id', async (req, res) => {
  const existing = await prisma.indicador.findUnique({ where: { id: req.params.id }, select: { id: true } });
  if (!existing) return res.status(404).json({ error: 'Indicador não encontrado' });
  const { nome, descricao, unidade, direcao, cargo_alvo, setor, formula, meta, periodicidade, responsavel, acumula, ativo } = req.body;
  const indicador = await prisma.indicador.update({
    where: { id: req.params.id },
    data: {
      ...(nome !== undefined && { nome }),
      ...(descricao !== undefined && { descricao: descricao || null }),
      ...(unidade !== undefined && { unidade: unidade || null }),
      ...(direcao !== undefined && { direcao: direcao === 'menor' ? 'menor' : 'maior' }),
      ...(cargo_alvo !== undefined && { cargo_alvo: cargo_alvo || null }),
      ...(setor !== undefined && { setor: setor || null }),
      ...(formula !== undefined && { formula: formula || null }),
      ...(meta !== undefined && { meta: meta || null }),
      ...(periodicidade !== undefined && { periodicidade: periodicidade || null }),
      ...(responsavel !== undefined && { responsavel: responsavel || null }),
      ...(acumula !== undefined && { acumula: !!acumula }),
      ...(ativo !== undefined && { ativo: !!ativo }),
    },
  });
  res.json(indicador);
});

indicadoresRouter.delete('/:id', async (req, res) => {
  const existing = await prisma.indicador.findUnique({ where: { id: req.params.id }, select: { id: true } });
  if (!existing) return res.status(404).json({ error: 'Indicador não encontrado' });
  await prisma.indicador.delete({ where: { id: req.params.id } });
  res.status(204).send();
});
