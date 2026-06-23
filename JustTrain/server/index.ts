import "dotenv/config";
import express from "express";
import cors from "cors";
import { createHash } from "node:crypto";
import { prisma } from "./lib/prisma.ts";
import { verificarDigital, biometriaOnline, MATCH_THRESHOLD } from "./lib/biometria.ts";

const db = prisma as any;
const app = express();
// (turma externa + calendário — client Prisma regenerado)
app.use(cors());
app.use(express.json({ limit: "8mb" }));

// O hash protege o snapshot do colaborador + a assinatura da presença (ordem fixa).
function calcHash(p: Record<string, any>, hashAnterior: string): string {
  const payload = {
    id: p.id,
    turma_id: p.turma_id,
    colaborador_id: p.colaborador_id ?? null,
    colaborador_nome: p.colaborador_nome ?? null,
    colaborador_cargo: p.colaborador_cargo ?? null,
    empresa_nome: p.empresa_nome ?? null,
    presente: p.presente,
    assinatura_img: p.assinatura_img ?? null,
    assinatura_tipo: p.assinatura_tipo ?? null,
    assinado_em: p.assinado_em ?? null,
    hash_anterior: hashAnterior,
  };
  return createHash("sha256").update(JSON.stringify(payload)).digest("hex");
}

const HOJE = () => new Date().toISOString();

app.get("/api/health", (_req, res) => res.json({ ok: true, service: "just-train" }));

// ---- Treinamentos (catálogo) ----
app.get("/api/treinamentos", async (_req, res) => {
  res.json(await db.treinamento.findMany({ orderBy: { nome: "asc" } }));
});
app.post("/api/treinamentos", async (req, res) => {
  try {
    const b = req.body ?? {};
    if (!b.nome) return res.status(400).json({ error: "nome é obrigatório" });
    res.status(201).json(
      await db.treinamento.create({
        data: {
          nome: b.nome,
          codigo: b.codigo ?? null,
          setor: b.setor ?? "sst",
          carga_horaria: Number(b.carga_horaria) || 0,
          validade_meses: b.validade_meses ? Number(b.validade_meses) : null,
          descricao: b.descricao ?? null,
        },
      }),
    );
  } catch (e) {
    res.status(400).json({ error: String((e as Error).message) });
  }
});
app.put("/api/treinamentos/:id", async (req, res) => {
  try {
    const { id, created_at, updated_at, turmas, ...data } = req.body ?? {};
    if (data.carga_horaria != null) data.carga_horaria = Number(data.carga_horaria) || 0;
    if (data.validade_meses != null) data.validade_meses = data.validade_meses ? Number(data.validade_meses) : null;
    res.json(await db.treinamento.update({ where: { id: req.params.id }, data }));
  } catch (e) {
    res.status(400).json({ error: String((e as Error).message) });
  }
});
app.delete("/api/treinamentos/:id", async (req, res) => {
  try {
    await db.treinamento.delete({ where: { id: req.params.id } });
    res.status(204).end();
  } catch (e) {
    res.status(400).json({ error: "não foi possível excluir (há turmas vinculadas?)" });
  }
});

// ---- Turmas (realizações) ----
app.get("/api/turmas", async (req, res) => {
  const { status, treinamento_id } = req.query as Record<string, string>;
  const where: any = {};
  if (status) where.status = status;
  if (treinamento_id) where.treinamento_id = treinamento_id;
  const rows = await db.turma.findMany({ where, orderBy: { data: "desc" }, include: { _count: { select: { participacoes: true } } } });
  res.json(rows);
});

app.get("/api/turmas/:id", async (req, res) => {
  const turma = await db.turma.findUnique({
    where: { id: req.params.id },
    include: { participacoes: { orderBy: { colaborador_nome: "asc" } } },
  });
  if (!turma) return res.status(404).json({ error: "turma não encontrada" });
  res.json(turma);
});

app.post("/api/turmas", async (req, res) => {
  try {
    const b = req.body ?? {};
    if (!b.treinamento_id || !b.data) return res.status(400).json({ error: "treinamento e data são obrigatórios" });
    const t = await db.treinamento.findUnique({ where: { id: b.treinamento_id } });
    if (!t) return res.status(400).json({ error: "treinamento não encontrado" });
    // a avaliação de eficácia ocorre 30 dias após a realização (Formulário pg.2)
    const avaliarEm = new Date(b.data + "T00:00:00");
    avaliarEm.setDate(avaliarEm.getDate() + 30);
    // snapshot do treinamento na turma
    const turma = await db.turma.create({
      data: {
        treinamento_id: t.id,
        treinamento_nome: t.nome,
        treinamento_codigo: t.codigo,
        tipo: t.tipo,
        setor: t.setor,
        carga_horaria: t.carga_horaria,
        validade_meses: t.validade_meses,
        data: b.data,
        origem: b.origem === "externa" ? "externa" : "interna",
        entidade_externa: b.entidade_externa ?? null,
        instrutor: b.instrutor ?? null,
        local: b.local ?? null,
        objetivo: b.objetivo ?? null,
        acao: b.acao ?? null,
        observacao: b.observacao ?? null,
        eficacia_avaliar_em: avaliarEm.toISOString().slice(0, 10),
      },
    });
    res.status(201).json(turma);
  } catch (e) {
    res.status(400).json({ error: String((e as Error).message) });
  }
});

app.put("/api/turmas/:id", async (req, res) => {
  try {
    const { id, created_at, updated_at, participacoes, treinamento, _count, ...data } = req.body ?? {};
    res.json(await db.turma.update({ where: { id: req.params.id }, data }));
  } catch (e) {
    res.status(400).json({ error: String((e as Error).message) });
  }
});

// ---- Participações (presença + assinatura) ----
// Adiciona um colaborador à turma (sem assinatura ainda). Snapshot do Core vem do front.
app.post("/api/turmas/:id/participantes", async (req, res) => {
  try {
    const b = req.body ?? {};
    if (!b.colaborador_nome) return res.status(400).json({ error: "colaborador é obrigatório" });
    const turma = await db.turma.findUnique({ where: { id: req.params.id } });
    if (!turma) return res.status(404).json({ error: "turma não encontrada" });
    const p = await db.participacao.create({
      data: {
        turma_id: turma.id,
        colaborador_id: b.colaborador_id ?? null,
        colaborador_nome: b.colaborador_nome,
        colaborador_matricula: b.colaborador_matricula ?? null,
        colaborador_cargo: b.colaborador_cargo ?? null,
        empresa_nome: b.empresa_nome ?? null,
        presente: false,
      },
    });
    res.status(201).json(p);
  } catch (e) {
    if (String((e as Error).message).includes("Unique")) return res.status(409).json({ error: "colaborador já está na turma" });
    res.status(400).json({ error: String((e as Error).message) });
  }
});

app.delete("/api/participacoes/:id", async (req, res) => {
  try {
    await db.participacao.delete({ where: { id: req.params.id } });
    res.status(204).end();
  } catch (e) {
    res.status(400).json({ error: String((e as Error).message) });
  }
});

// Assina a presença. assinatura_img = base64 (canvas manuscrito OU digital). Se o
// colaborador tem digital cadastrada no Core e o tipo é "digital", verifica 1:1.
app.post("/api/participacoes/:id/assinar", async (req, res) => {
  try {
    const b = req.body ?? {};
    const p = await db.participacao.findUnique({ where: { id: req.params.id } });
    if (!p) return res.status(404).json({ error: "participação não encontrada" });
    const tipo = ["manuscrita", "digital", "simulado", "declarado"].includes(b.assinatura_tipo) ? b.assinatura_tipo : "manuscrita";

    // Presença declarada (treinamento externo) não exige imagem de assinatura.
    if (tipo !== "declarado" && !b.assinatura_img) return res.status(400).json({ error: "assinatura é obrigatória" });

    // Verificação biométrica 1:1 só quando a assinatura é por digital.
    let bio: { enrolled: boolean; match: boolean; score: number } | null = null;
    if (tipo === "digital" && p.colaborador_id) {
      try {
        const v = await verificarDigital(p.colaborador_id, b.assinatura_img);
        bio = { enrolled: v.enrolled, match: v.match, score: v.score };
        if (v.enrolled && !v.match) {
          return res.status(403).json({
            error: `A digital não confere com o cadastro de ${p.colaborador_nome}. Assinatura recusada.`,
            biometria: v,
          });
        }
      } catch (e) {
        console.warn("[biometria] verificação indisponível, prosseguindo:", (e as Error).message);
      }
    }

    const assinado_em = HOJE();
    const atualizada = await db.participacao.update({
      where: { id: p.id },
      data: {
        presente: true,
        assinatura_img: b.assinatura_img,
        assinatura_tipo: tipo,
        assinado_em,
        bio_enrolled: bio?.enrolled ?? null,
        bio_match: bio?.match ?? null,
        bio_score: bio?.score ?? null,
      },
    });

    // Cadeia de hash: encadeia pela ordem de assinatura (created_at + id estável).
    const prev = await db.participacao.findFirst({
      where: { assinado_em: { not: null, lt: assinado_em } },
      orderBy: { assinado_em: "desc" },
      select: { hash: true },
    });
    const hashAnterior = prev?.hash ?? "GENESIS";
    const hash = calcHash(atualizada, hashAnterior);
    const final = await db.participacao.update({ where: { id: p.id }, data: { hash, hash_anterior: hashAnterior } });
    res.json(final);
  } catch (e) {
    res.status(400).json({ error: String((e as Error).message) });
  }
});

// Emite o certificado (marca a data e calcula a validade a partir do treinamento).
app.post("/api/participacoes/:id/emitir", async (req, res) => {
  try {
    const p = await db.participacao.findUnique({ where: { id: req.params.id } });
    if (!p) return res.status(404).json({ error: "participação não encontrada" });
    if (!p.presente) return res.status(400).json({ error: "presença não assinada — não pode emitir certificado" });
    const turma = await db.turma.findUnique({ where: { id: p.turma_id } });
    let valido_ate: string | null = null;
    if (turma?.validade_meses) {
      const base = new Date(turma.data + "T00:00:00");
      base.setMonth(base.getMonth() + turma.validade_meses);
      valido_ate = base.toISOString().slice(0, 10);
    }
    const final = await db.participacao.update({
      where: { id: p.id },
      data: { certificado_em: HOJE(), certificado_valido_ate: valido_ate, ged_documento_id: req.body?.ged_documento_id ?? p.ged_documento_id },
    });
    res.json(final);
  } catch (e) {
    res.status(400).json({ error: String((e as Error).message) });
  }
});

// Dados do certificado (o front renderiza o layout único, com o setor no conteúdo).
app.get("/api/participacoes/:id/certificado", async (req, res) => {
  const p = await db.participacao.findUnique({ where: { id: req.params.id } });
  if (!p) return res.status(404).json({ error: "participação não encontrada" });
  const turma = await db.turma.findUnique({ where: { id: p.turma_id } });
  res.json({ participacao: p, turma });
});

// Verificação da cadeia de hash (prova de não-adulteração das presenças assinadas).
app.get("/api/participacoes/verificacao", async (_req, res) => {
  const rows = await db.participacao.findMany({ where: { assinado_em: { not: null } }, orderBy: { assinado_em: "asc" } });
  let anterior = "GENESIS";
  const quebras: string[] = [];
  for (const r of rows) {
    const esperado = calcHash(r, anterior);
    if (r.hash_anterior !== anterior || r.hash !== esperado) quebras.push(r.id);
    anterior = r.hash;
  }
  res.json({ ok: quebras.length === 0, total: rows.length, quebras });
});

// Registra a avaliação de eficácia (após 30 dias). Se não eficaz -> sinaliza refazer.
app.post("/api/turmas/:id/eficacia", async (req, res) => {
  try {
    const b = req.body ?? {};
    const data: any = {
      eficacia_em: HOJE(),
      eficacia_proc_seguidos: b.proc_seguidos ?? null,
      eficacia_houve_nc: b.houve_nc ?? null,
      eficacia_eficaz: b.eficaz ?? null,
      eficacia_obs: b.obs ?? null,
    };
    res.json(await db.turma.update({ where: { id: req.params.id }, data }));
  } catch (e) {
    res.status(400).json({ error: String((e as Error).message) });
  }
});

// ---- Requisitos de treinamento (matriz cargo × treinamento) ----
app.get("/api/requisitos", async (req, res) => {
  const { cargo } = req.query as Record<string, string>;
  const where = cargo ? { cargo } : {};
  res.json(await db.requisitoTreinamento.findMany({ where, orderBy: { treinamento_nome: "asc" } }));
});
app.post("/api/requisitos", async (req, res) => {
  try {
    const b = req.body ?? {};
    if (!b.cargo || !b.treinamento_codigo) return res.status(400).json({ error: "cargo e treinamento_codigo são obrigatórios" });
    res.status(201).json(
      await db.requisitoTreinamento.create({
        data: { cargo: b.cargo, treinamento_codigo: b.treinamento_codigo, treinamento_nome: b.treinamento_nome ?? b.treinamento_codigo, condicional: !!b.condicional },
      }),
    );
  } catch (e) {
    res.status(400).json({ error: String((e as Error).message) });
  }
});
app.delete("/api/requisitos/:id", async (req, res) => {
  try {
    await db.requisitoTreinamento.delete({ where: { id: req.params.id } });
    res.status(204).end();
  } catch (e) {
    res.status(400).json({ error: String((e as Error).message) });
  }
});

// Painel de conformidade de UM colaborador: cruza os requisitos do cargo com os
// treinamentos que ele de fato concluiu (certificado emitido), calculando o status.
//   GET /api/matriz?colaborador_id=&cargo=
app.get("/api/matriz", async (req, res) => {
  try {
    const { colaborador_id, cargo } = req.query as Record<string, string>;
    if (!cargo) return res.json({ requisitos: [] });
    const reqs = await db.requisitoTreinamento.findMany({ where: { cargo }, orderBy: { treinamento_nome: "asc" } });
    const parts = colaborador_id
      ? await db.participacao.findMany({
          where: { colaborador_id, presente: true, certificado_em: { not: null } },
          include: { turma: true },
        })
      : [];
    const hoje = HOJE().slice(0, 10);
    const linhas = reqs.map((r: any) => {
      // 'it_execucao' é satisfeito por QUALQUER treinamento de instrução de trabalho concluído
      const feitos = parts.filter((p: any) =>
        r.treinamento_codigo === "it_execucao" ? p.turma?.tipo === "it" : p.turma?.treinamento_codigo === r.treinamento_codigo,
      );
      let status = "pendente";
      let valido_ate: string | null = null;
      if (feitos.length) {
        valido_ate = feitos.map((p: any) => p.certificado_valido_ate).filter(Boolean).sort().pop() ?? null;
        status = valido_ate && valido_ate < hoje ? "vencido" : "em_dia";
      }
      return { ...r, status, valido_ate };
    });
    const resumo = {
      total: linhas.length,
      em_dia: linhas.filter((l: any) => l.status === "em_dia").length,
      vencido: linhas.filter((l: any) => l.status === "vencido").length,
      pendente: linhas.filter((l: any) => l.status === "pendente").length,
    };
    res.json({ requisitos: linhas, resumo });
  } catch (e) {
    res.status(500).json({ error: String((e as Error).message) });
  }
});

// ---- Calendário de eventos ----
// Agrega: turmas futuras, eficácias pendentes, certificados vencendo (próx. 12 meses).
app.get("/api/calendario", async (req, res) => {
  try {
    const hoje = HOJE().slice(0, 10);
    const d = new Date(hoje + "T00:00:00");
    d.setFullYear(d.getFullYear() + 1);
    const fimPeriodo = d.toISOString().slice(0, 10);

    const [turmas_agendadas, eficacias_pendentes, certificados_vencendo] = await Promise.all([
      db.turma.findMany({
        where: { status: "aberta", data: { gte: hoje } },
        orderBy: { data: "asc" },
        include: { _count: { select: { participacoes: true } } },
      }),
      db.turma.findMany({
        where: { eficacia_avaliar_em: { lte: hoje }, eficacia_em: null, status: "concluida" },
        orderBy: { eficacia_avaliar_em: "asc" },
      }),
      db.participacao.findMany({
        where: { certificado_valido_ate: { gte: hoje, lte: fimPeriodo }, presente: true },
        include: { turma: { select: { treinamento_nome: true, treinamento_codigo: true } } },
        orderBy: { certificado_valido_ate: "asc" },
      }),
    ]);
    res.json({ turmas_agendadas, eficacias_pendentes, certificados_vencendo });
  } catch (e) {
    res.status(500).json({ error: String((e as Error).message) });
  }
});

// ---- Biometria (verificação) — cadastro é no JustCore ----
app.get("/api/biometria/health", async (_req, res) => {
  res.json({ online: await biometriaOnline(), threshold: MATCH_THRESHOLD });
});
app.post("/api/biometria/verify", async (req, res) => {
  const b = req.body ?? {};
  if (!b.colaborador_id || !b.image) return res.status(400).json({ error: "colaborador_id e image são obrigatórios" });
  try {
    res.json(await verificarDigital(b.colaborador_id, b.image));
  } catch (e) {
    res.status(503).json({ error: "serviço de biometria indisponível: " + (e as Error).message });
  }
});

const PORT = 4600;
app.listen(PORT, () => console.log(`API JustTrain rodando em http://localhost:${PORT}`));
