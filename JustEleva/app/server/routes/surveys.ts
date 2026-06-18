import { Router } from 'express';
import { prisma } from '../lib/prisma.js';

export const surveysRouter = Router();

const formTree = {
  dimensions: {
    orderBy: { sort_order: 'asc' as const },
    include: { questions: { orderBy: { sort_order: 'asc' as const } } },
  },
};

type DimensionInput = { title: string; questions?: { text: string; kind?: string; allow_na?: boolean }[] };

async function replaceDimensions(tx: any, formId: string, dimensions: DimensionInput[]) {
  await tx.surveyDimension.deleteMany({ where: { form_id: formId } });
  for (let di = 0; di < dimensions.length; di++) {
    const dim = dimensions[di];
    const created = await tx.surveyDimension.create({
      data: { form_id: formId, title: dim.title, sort_order: di },
    });
    const qs = dim.questions ?? [];
    for (let qi = 0; qi < qs.length; qi++) {
      await tx.surveyQuestion.create({
        data: {
          dimension_id: created.id,
          text: qs[qi].text,
          kind: qs[qi].kind === 'enps' ? 'enps' : 'scale',
          allow_na: qs[qi].allow_na ?? true,
          sort_order: qi,
        },
      });
    }
  }
}

/* ----------------------------- FORMULÁRIOS ----------------------------- */

surveysRouter.get('/forms', async (_req, res) => {
  const forms = await prisma.surveyForm.findMany({ include: formTree, orderBy: { created_at: 'asc' } });
  res.json(forms);
});

surveysRouter.get('/forms/:id', async (req, res) => {
  const form = await prisma.surveyForm.findUnique({ where: { id: req.params.id }, include: formTree });
  if (!form) return res.status(404).json({ error: 'Formulário não encontrado' });
  res.json(form);
});

surveysRouter.post('/forms', async (req, res) => {
  const { name, dimensions } = req.body;
  if (!name) return res.status(400).json({ error: 'name é obrigatório' });
  const form = await prisma.$transaction(async (tx) => {
    const created = await tx.surveyForm.create({ data: { name } });
    if (Array.isArray(dimensions)) await replaceDimensions(tx, created.id, dimensions);
    return tx.surveyForm.findUnique({ where: { id: created.id }, include: formTree });
  });
  res.status(201).json(form);
});

surveysRouter.put('/forms/:id', async (req, res) => {
  const existing = await prisma.surveyForm.findUnique({ where: { id: req.params.id }, select: { id: true } });
  if (!existing) return res.status(404).json({ error: 'Formulário não encontrado' });
  const { name, is_active, dimensions } = req.body;
  const form = await prisma.$transaction(async (tx) => {
    await tx.surveyForm.update({
      where: { id: req.params.id },
      data: { ...(name !== undefined && { name }), ...(is_active !== undefined && { is_active: !!is_active }) },
    });
    if (Array.isArray(dimensions)) await replaceDimensions(tx, req.params.id, dimensions);
    return tx.surveyForm.findUnique({ where: { id: req.params.id }, include: formTree });
  });
  res.json(form);
});

surveysRouter.delete('/forms/:id', async (req, res) => {
  const existing = await prisma.surveyForm.findUnique({ where: { id: req.params.id }, select: { id: true } });
  if (!existing) return res.status(404).json({ error: 'Formulário não encontrado' });
  await prisma.surveyForm.delete({ where: { id: req.params.id } });
  res.status(204).send();
});

/* ----------------------------- CAMPANHAS ----------------------------- */

surveysRouter.get('/campaigns', async (_req, res) => {
  const campaigns = await prisma.surveyCampaign.findMany({
    include: { form: { select: { name: true } }, _count: { select: { responses: true, actions: true } } },
    orderBy: { created_at: 'desc' },
  });
  res.json(campaigns.map(c => ({ ...c, form_name: c.form?.name, response_count: c._count.responses, action_count: c._count.actions })));
});

surveysRouter.post('/campaigns', async (req, res) => {
  const { name, revision, form_id, start_date, end_date, status, min_n } = req.body;
  if (!name || !form_id) return res.status(400).json({ error: 'name e form_id são obrigatórios' });
  const campaign = await prisma.surveyCampaign.create({
    data: { name, revision: revision ?? null, form_id, start_date: start_date ?? null, end_date: end_date ?? null, status: status ?? 'draft', min_n: min_n ?? 5 },
  });
  res.status(201).json(campaign);
});

surveysRouter.put('/campaigns/:id', async (req, res) => {
  const existing = await prisma.surveyCampaign.findUnique({ where: { id: req.params.id }, select: { id: true } });
  if (!existing) return res.status(404).json({ error: 'Campanha não encontrada' });
  const { name, revision, status, start_date, end_date, min_n } = req.body;
  const campaign = await prisma.surveyCampaign.update({
    where: { id: req.params.id },
    data: {
      ...(name !== undefined && { name }), ...(revision !== undefined && { revision }),
      ...(status !== undefined && { status }), ...(start_date !== undefined && { start_date }),
      ...(end_date !== undefined && { end_date }), ...(min_n !== undefined && { min_n }),
    },
  });
  res.json(campaign);
});

/* ----------------------------- RESPONDER (ANÔNIMO) ----------------------------- */

surveysRouter.post('/campaigns/:id/responses', async (req, res) => {
  const campaign = await prisma.surveyCampaign.findUnique({ where: { id: req.params.id }, select: { id: true, status: true } });
  if (!campaign) return res.status(404).json({ error: 'Campanha não encontrada' });
  const { cost_center, answers, comment } = req.body as { cost_center?: string; answers?: Record<string, number | null>; comment?: string };

  await prisma.$transaction(async (tx) => {
    const response = await tx.surveyResponse.create({
      data: { campaign_id: req.params.id, cost_center: cost_center ?? null, source: 'digital' },
    });
    for (const [question_id, score] of Object.entries(answers ?? {})) {
      if (score === null || score === undefined) continue;
      await tx.surveyAnswer.create({ data: { response_id: response.id, question_id, score: Number(score) } });
    }
    if (comment && comment.trim()) {
      await tx.surveyComment.create({ data: { campaign_id: req.params.id, cost_center: cost_center ?? null, text: comment.trim() } });
    }
  });
  res.status(201).json({ ok: true });
});

/* ----------------------------- IMPORTAR HISTÓRICO ----------------------------- */

surveysRouter.post('/campaigns/:id/import', async (req, res) => {
  const campaign = await prisma.surveyCampaign.findUnique({ where: { id: req.params.id }, select: { id: true } });
  if (!campaign) return res.status(404).json({ error: 'Campanha não encontrada' });
  const { rows } = req.body as { rows?: { question_id: string; cost_center: string; n?: number; c5?: number; c4?: number; c3?: number; c2?: number; c1?: number; media?: number }[] };
  if (!Array.isArray(rows)) return res.status(400).json({ error: 'rows é obrigatório' });
  await prisma.$transaction(async (tx) => {
    for (const r of rows) {
      await tx.surveyImportedResult.create({
        data: {
          campaign_id: req.params.id, question_id: r.question_id, cost_center: r.cost_center,
          n: r.n ?? 0, c5: r.c5 ?? 0, c4: r.c4 ?? 0, c3: r.c3 ?? 0, c2: r.c2 ?? 0, c1: r.c1 ?? 0, media: r.media ?? null,
        },
      });
    }
  });
  res.status(201).json({ ok: true, count: rows.length });
});

/* ----------------------------- RESULTADOS (com N mínimo) ----------------------------- */

type Acc = { n: number; sum: number; dist: Record<number, number> };
function newAcc(): Acc { return { n: 0, sum: 0, dist: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 } }; }

surveysRouter.get('/campaigns/:id/results', async (req, res) => {
  const campaign = await prisma.surveyCampaign.findUnique({
    where: { id: req.params.id },
    include: { form: { include: formTree } },
  });
  if (!campaign) return res.status(404).json({ error: 'Campanha não encontrada' });

  const dims = campaign.form.dimensions;
  const questions = dims.flatMap(d => d.questions.map(q => ({ ...q, dimension_id: d.id, dimension_title: d.title })));
  const qById = new Map(questions.map(q => [q.id, q]));
  const scaleQ = new Set(questions.filter(q => q.kind === 'scale').map(q => q.id));
  const enpsQ = new Set(questions.filter(q => q.kind === 'enps').map(q => q.id));

  // acumuladores por (cost_center, question_id) — só escala
  const accByCcQ = new Map<string, Acc>();
  const enpsByCc = new Map<string, { promoters: number; passives: number; detractors: number; n: number }>();
  const respByCc = new Map<string, number>(); // nº de respondentes por obra (para N mínimo)
  const key = (cc: string, q: string) => `${cc}|||${q}`;

  // digital
  const responses = await prisma.surveyResponse.findMany({ where: { campaign_id: req.params.id }, include: { answers: true } });
  for (const r of responses) {
    const cc = r.cost_center || '(sem obra)';
    respByCc.set(cc, (respByCc.get(cc) || 0) + 1);
    for (const a of r.answers) {
      if (a.score === null) continue;
      if (scaleQ.has(a.question_id)) {
        const k = key(cc, a.question_id);
        const acc = accByCcQ.get(k) || newAcc();
        acc.n++; acc.sum += a.score; if (acc.dist[a.score] !== undefined) acc.dist[a.score]++;
        accByCcQ.set(k, acc);
      } else if (enpsQ.has(a.question_id)) {
        const e = enpsByCc.get(cc) || { promoters: 0, passives: 0, detractors: 0, n: 0 };
        e.n++;
        if (a.score >= 9) e.promoters++; else if (a.score >= 7) e.passives++; else e.detractors++;
        enpsByCc.set(cc, e);
      }
    }
  }

  // importado (só escala)
  const imported = await prisma.surveyImportedResult.findMany({ where: { campaign_id: req.params.id } });
  for (const im of imported) {
    if (!scaleQ.has(im.question_id)) continue;
    const cc = im.cost_center || '(sem obra)';
    respByCc.set(cc, Math.max(respByCc.get(cc) || 0, im.n));
    const k = key(cc, im.question_id);
    const acc = accByCcQ.get(k) || newAcc();
    const cnt = im.c5 + im.c4 + im.c3 + im.c2 + im.c1;
    if (cnt > 0) {
      acc.dist[5] += im.c5; acc.dist[4] += im.c4; acc.dist[3] += im.c3; acc.dist[2] += im.c2; acc.dist[1] += im.c1;
      acc.n += cnt; acc.sum += 5 * im.c5 + 4 * im.c4 + 3 * im.c3 + 2 * im.c2 + 1 * im.c1;
    } else if (im.media != null && im.n > 0) {
      // só média informada (importação do Quadro Resumo) — sem distribuição
      acc.n += im.n; acc.sum += im.media * im.n;
    }
    accByCcQ.set(k, acc);
  }

  const costCenters = [...respByCc.keys()].sort();
  const minN = campaign.min_n;
  // grupos que atingem o N mínimo — só estes entram em qualquer agregado (anonimato)
  const visibleCC = new Set(costCenters.filter(cc => (respByCc.get(cc) || 0) >= minN));

  // monta matriz dimensão × obra
  const byDimension = dims.map(d => {
    const dScaleQ = d.questions.filter(q => q.kind === 'scale').map(q => q.id);
    const cells: Record<string, { media: number; favorability: number; n: number } | { suppressed: true }> = {};
    let geralSum = 0, geralN = 0, geralFav = 0, geralFavN = 0;
    for (const cc of costCenters) {
      const grp = newAcc();
      for (const qid of dScaleQ) {
        const acc = accByCcQ.get(key(cc, qid));
        if (!acc) continue;
        grp.n += acc.n; grp.sum += acc.sum;
        for (const s of [1, 2, 3, 4, 5]) grp.dist[s] += acc.dist[s];
      }
      const ccRespN = respByCc.get(cc) || 0;
      if (grp.n === 0 || ccRespN < minN) { cells[cc] = { suppressed: true }; continue; }
      // só grupos visíveis (≥ N mínimo) entram no Geral e na favorabilidade
      geralSum += grp.sum; geralN += grp.n;
      const distTotal = grp.dist[1] + grp.dist[2] + grp.dist[3] + grp.dist[4] + grp.dist[5];
      const fav = grp.dist[4] + grp.dist[5];
      if (distTotal > 0) { geralFav += fav; geralFavN += distTotal; }
      cells[cc] = {
        media: Math.round((grp.sum / grp.n) * 10) / 10,
        favorability: distTotal > 0 ? Math.round((fav / distTotal) * 100) : null,
        n: ccRespN,
      };
    }
    return {
      id: d.id, title: d.title,
      cells,
      geral: geralN > 0 ? Math.round((geralSum / geralN) * 10) / 10 : null,
      favorability: geralFavN > 0 ? Math.round((geralFav / geralFavN) * 100) : null,
    };
  });

  // média global e eNPS — apenas grupos visíveis (≥ N mínimo)
  let allSum = 0, allN = 0;
  for (const [k, acc] of accByCcQ.entries()) { if (visibleCC.has(k.split('|||')[0])) { allSum += acc.sum; allN += acc.n; } }
  const overallMedia = allN > 0 ? Math.round((allSum / allN) * 10) / 10 : null;

  let proms = 0, dets = 0, enpsN = 0;
  for (const [cc, e] of enpsByCc.entries()) { if (visibleCC.has(cc)) { proms += e.promoters; dets += e.detractors; enpsN += e.n; } }
  const enps = enpsN >= minN ? Math.round(((proms - dets) / enpsN) * 100) : null;

  const comments = await prisma.surveyComment.findMany({ where: { campaign_id: req.params.id }, orderBy: { created_at: 'desc' } });

  res.json({
    campaign: { id: campaign.id, name: campaign.name, revision: campaign.revision, status: campaign.status, min_n: minN },
    costCenters,
    nByCostCenter: Object.fromEntries(respByCc),
    byDimension,
    overallMedia,
    enps,
    comments: comments.map(c => ({ id: c.id, text: c.text, cost_center: c.cost_center })),
    questionMeta: questions.map(q => ({ id: q.id, text: q.text, kind: q.kind, dimension_title: q.dimension_title })),
  });
});

/* ----------------------------- PLANO DE AÇÃO ----------------------------- */

surveysRouter.get('/campaigns/:id/actions', async (req, res) => {
  const actions = await prisma.surveyAction.findMany({ where: { campaign_id: req.params.id }, orderBy: { created_at: 'desc' } });
  res.json(actions);
});

surveysRouter.post('/campaigns/:id/actions', async (req, res) => {
  const campaign = await prisma.surveyCampaign.findUnique({ where: { id: req.params.id }, select: { id: true } });
  if (!campaign) return res.status(404).json({ error: 'Campanha não encontrada' });
  const { dimension_title, cost_center, title, description, owner, deadline, status } = req.body;
  if (!title || !dimension_title) return res.status(400).json({ error: 'title e dimension_title são obrigatórios' });
  const action = await prisma.surveyAction.create({
    data: { campaign_id: req.params.id, dimension_title, cost_center: cost_center ?? null, title, description: description ?? null, owner: owner ?? null, deadline: deadline ?? null, status: status ?? 'pending' },
  });
  res.status(201).json(action);
});

surveysRouter.put('/actions/:actionId', async (req, res) => {
  const existing = await prisma.surveyAction.findUnique({ where: { id: req.params.actionId }, select: { id: true } });
  if (!existing) return res.status(404).json({ error: 'Ação não encontrada' });
  const { dimension_title, cost_center, title, description, owner, deadline, status } = req.body;
  const action = await prisma.surveyAction.update({
    where: { id: req.params.actionId },
    data: {
      ...(dimension_title !== undefined && { dimension_title }), ...(cost_center !== undefined && { cost_center }),
      ...(title !== undefined && { title }), ...(description !== undefined && { description }),
      ...(owner !== undefined && { owner }), ...(deadline !== undefined && { deadline }), ...(status !== undefined && { status }),
    },
  });
  res.json(action);
});

surveysRouter.delete('/actions/:actionId', async (req, res) => {
  const existing = await prisma.surveyAction.findUnique({ where: { id: req.params.actionId }, select: { id: true } });
  if (!existing) return res.status(404).json({ error: 'Ação não encontrada' });
  await prisma.surveyAction.delete({ where: { id: req.params.actionId } });
  res.status(204).send();
});
