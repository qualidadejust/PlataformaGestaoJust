import express from "express";
import cors from "cors";
import { createHash } from "node:crypto";
import { prisma } from "./lib/prisma.ts";
import { abrirFicha, statusFicha, registrarInspecao, baixarFicha } from "./ciclo.ts";
import { verificarDigital, biometriaOnline, MATCH_THRESHOLD } from "./biometria.ts";

// O hash do registro protege o snapshot do colaborador/EPI + o motivo (ordem fixa) —
// exatamente o que está no termo. Os campos lidos abaixo (em calcHash) são canônicos.

function calcHash(c: Record<string, unknown>, hashAnterior: string): string {
  const payload = {
    id: c.id,
    colaborador_id: c.colaborador_id ?? null,
    colaborador_nome: c.colaborador_nome ?? null,
    colaborador_cargo: c.colaborador_cargo ?? null,
    empresa_nome: c.empresa_nome ?? null,
    epi_id: c.epi_id ?? null,
    epi_nome: c.epi_nome ?? null,
    epi_ca: c.epi_ca ?? null,
    quantidade: c.quantidade,
    motivo: c.motivo ?? "inicial",
    entregue_em: c.entregue_em,
    assinatura_img: c.assinatura_img,
    assinatura_tipo: c.assinatura_tipo,
    observacao: c.observacao ?? null,
    hash_anterior: hashAnterior,
  };
  return createHash("sha256").update(JSON.stringify(payload)).digest("hex");
}

const app = express();
app.use(cors());
app.use(express.json({ limit: "8mb" }));

app.get("/api/health", (_req, res) => res.json({ ok: true, service: "just-security" }));

// Colaboradores e EPIs agora vêm do JustCore (a UI consome /core/api/... via proxy).

// ---- Entregas (locais, com snapshot do Core) ----
app.get("/api/entregas/verificacao", async (_req, res) => {
  const rows = await prisma.entregas.findMany({ orderBy: { id: "asc" } });
  let anterior = "GENESIS";
  const quebras: number[] = [];
  for (const r of rows) {
    const esperado = calcHash(r, anterior);
    if (r.hash_anterior !== anterior || r.hash !== esperado) quebras.push(r.id);
    anterior = r.hash;
  }
  res.json({ ok: quebras.length === 0, total: rows.length, quebras });
});

app.get("/api/entregas", async (_req, res) => {
  res.json(await prisma.entregas.findMany({ orderBy: { entregue_em: "desc" } }));
});

app.post("/api/entregas", async (req, res) => {
  const b = req.body ?? {};
  if (!b.colaborador_nome || !b.epi_nome) {
    return res.status(400).json({ error: "colaborador e EPI são obrigatórios" });
  }
  if (!b.assinatura_img) {
    return res.status(400).json({ error: "assinatura (digital) é obrigatória" });
  }

  // Verificação biométrica 1:1: se o colaborador tem digital cadastrada, a
  // assinatura precisa bater com ela (impede assinar pela outra pessoa).
  // Guardamos o resultado para auditoria (mostrado na confirmação/histórico/termo).
  let bio: { enrolled: boolean; match: boolean; score: number } | null = null;
  if (b.colaborador_id) {
    try {
      const v = await verificarDigital(b.colaborador_id, b.assinatura_img);
      bio = { enrolled: v.enrolled, match: v.match, score: v.score };
      if (v.enrolled && !v.match) {
        return res.status(403).json({
          error: `A digital não confere com o cadastro de ${b.colaborador_nome}. Assinatura recusada.`,
          biometria: v,
        });
      }
    } catch (e) {
      console.warn("[biometria] verificação indisponível, prosseguindo:", (e as Error).message);
    }
  }

  const motivo = ["inicial", "complementar", "troca"].includes(b.motivo) ? b.motivo : "inicial";
  const entregue_em = new Date().toISOString();

  const criada = await prisma.entregas.create({
    data: {
      colaborador_id: b.colaborador_id ?? null,
      colaborador_nome: b.colaborador_nome,
      colaborador_matricula: b.colaborador_matricula ?? null,
      colaborador_cargo: b.colaborador_cargo ?? null,
      empresa_nome: b.empresa_nome ?? null,
      epi_id: b.epi_id ?? null,
      epi_nome: b.epi_nome,
      epi_ca: b.epi_ca ?? null,
      quantidade: Number(b.quantidade) || 1,
      motivo,
      entregue_em,
      assinatura_img: b.assinatura_img,
      assinatura_tipo: b.assinatura_tipo ?? "digital",
      observacao: b.observacao ?? null,
    },
  });

  const id = criada.id;
  const prev = await prisma.entregas.findFirst({
    where: { id: { lt: id } },
    orderBy: { id: "desc" },
    select: { hash: true },
  });
  const hashAnterior = prev?.hash ?? "GENESIS";
  // calcHash usa só os campos canônicos, que já estão em `criada` (antes da ficha/bio).
  const hash = calcHash(criada, hashAnterior);
  await prisma.entregas.update({ where: { id }, data: { hash, hash_anterior: hashAnterior } });

  // Abre a ficha de EPI decorrente desta entrega (troca baixa a anterior).
  const fichaId = await abrirFicha({
    colaborador_id: b.colaborador_id ?? null,
    colaborador_nome: b.colaborador_nome,
    colaborador_matricula: b.colaborador_matricula ?? null,
    colaborador_cargo: b.colaborador_cargo ?? null,
    empresa_nome: b.empresa_nome ?? null,
    epi_id: b.epi_id ?? null,
    epi_nome: b.epi_nome,
    epi_ca: b.epi_ca ?? null,
    tipo_controle: b.tipo_controle ?? "prazo",
    validade_dias: b.validade_dias ?? null,
    alerta_dias: b.alerta_dias ?? null,
    motivo,
    entrega_id: id,
    entregue_em,
  });
  await prisma.entregas.update({ where: { id }, data: { ficha_id: fichaId } });

  // Registra o resultado da verificação biométrica (auditoria).
  if (bio) {
    await prisma.entregas.update({
      where: { id },
      data: { bio_enrolled: bio.enrolled ? 1 : 0, bio_match: bio.match ? 1 : 0, bio_score: bio.score },
    });
  }

  res.status(201).json(await prisma.entregas.findUnique({ where: { id } }));
});

// ---- Fichas de EPI (ciclo de vida) ----
const HOJE = () => new Date().toISOString();

// Lista de fichas com status calculado. Filtros: ?status=ativa&colaborador_id=&q=
app.get("/api/fichas", async (req, res) => {
  const { status, colaborador_id, q } = req.query as Record<string, string>;
  const where: any = {};
  if (status) where.status = status;
  if (colaborador_id) where.colaborador_id = colaborador_id;
  if (q) where.OR = [{ colaborador_nome: { contains: q } }, { epi_nome: { contains: q } }];
  const rows = await prisma.fichas.findMany({ where, orderBy: { entregue_em: "desc" } });
  const hoje = HOJE();
  res.json(rows.map((f: any) => ({ ...f, status_calc: statusFicha(f, hoje) })));
});

// Resumo para dashboard: contagens por status operacional (fichas ativas).
app.get("/api/fichas/resumo", async (_req, res) => {
  const ativas = await prisma.fichas.findMany({ where: { status: "ativa" } });
  const hoje = HOJE();
  const cont: Record<string, number> = {};
  for (const f of ativas) {
    const c = statusFicha(f, hoje).codigo;
    cont[c] = (cont[c] ?? 0) + 1;
  }
  res.json({ total_ativas: ativas.length, por_status: cont });
});

// Detalhe de uma ficha + timeline (entregas da cadeia de troca + inspeções).
app.get("/api/fichas/:id", async (req, res) => {
  const ficha = await prisma.fichas.findUnique({ where: { id: Number(req.params.id) } });
  if (!ficha) return res.status(404).json({ error: "ficha não encontrada" });
  const inspecoes = await prisma.inspecoes.findMany({ where: { ficha_id: ficha.id }, orderBy: { data: "asc" } });
  const entrega = ficha.entrega_id
    ? await prisma.entregas.findUnique({ where: { id: ficha.entrega_id } })
    : null;
  res.json({ ...ficha, status_calc: statusFicha(ficha), inspecoes, entrega });
});

// Histórico do EPI: cadeia de fichas (inicial → trocas → baixa) de um colaborador+EPI.
app.get("/api/fichas/:id/historico", async (req, res) => {
  const base = await prisma.fichas.findUnique({ where: { id: Number(req.params.id) } });
  if (!base) return res.status(404).json({ error: "ficha não encontrada" });
  const cadeia = await prisma.fichas.findMany({
    where: { colaborador_id: base.colaborador_id, epi_id: base.epi_id },
    orderBy: { entregue_em: "asc" },
  });
  res.json(cadeia.map((f: any) => ({ ...f, status_calc: statusFicha(f) })));
});

// Registrar inspeção (com digital do inspetor — verificada 1:1 se cadastrado).
app.post("/api/fichas/:id/inspecoes", async (req, res) => {
  const b = req.body ?? {};
  if (b.inspetor_id && b.assinatura_img) {
    try {
      const v = await verificarDigital(b.inspetor_id, b.assinatura_img);
      if (v.enrolled && !v.match) {
        return res.status(403).json({ error: "A digital não confere com o cadastro do inspetor. Inspeção recusada.", biometria: v });
      }
    } catch (e) {
      console.warn("[biometria] verificação indisponível, prosseguindo:", (e as Error).message);
    }
  }
  const r = await registrarInspecao(Number(req.params.id), b);
  if (!r.ok) return res.status(400).json({ error: r.erro });
  res.status(201).json(await prisma.fichas.findUnique({ where: { id: Number(req.params.id) } }));
});

// Baixa manual da ficha (sem assinatura por digital).
app.post("/api/fichas/:id/baixa", async (req, res) => {
  const r = await baixarFicha(Number(req.params.id), req.body ?? {});
  if (!r.ok) return res.status(400).json({ error: r.erro });
  res.json(await prisma.fichas.findUnique({ where: { id: Number(req.params.id) } }));
});

// ---- Biometria (verificação) — o CADASTRO é no JustCore (junto do colaborador) ----
app.get("/api/biometria/health", async (_req, res) => {
  res.json({ online: await biometriaOnline(), threshold: MATCH_THRESHOLD });
});

// Verifica uma digital contra o cadastro do colaborador (feedback no front).
app.post("/api/biometria/verify", async (req, res) => {
  const b = req.body ?? {};
  if (!b.colaborador_id || !b.image) {
    return res.status(400).json({ error: "colaborador_id e image são obrigatórios" });
  }
  try {
    res.json(await verificarDigital(b.colaborador_id, b.image));
  } catch (e) {
    res.status(503).json({ error: "serviço de biometria indisponível: " + (e as Error).message });
  }
});

// Backfill: registros sem hash (migrados ou antigos) recebem hash, encadeados por id.
async function backfillHashes() {
  const rows = await prisma.entregas.findMany({ orderBy: { id: "asc" } });
  let anterior = "GENESIS";
  let n = 0;
  for (const r of rows) {
    if (!r.hash) {
      const h = calcHash(r, anterior);
      await prisma.entregas.update({ where: { id: r.id }, data: { hash: h, hash_anterior: anterior } });
      anterior = h;
      n++;
    } else {
      anterior = r.hash;
    }
  }
  if (n > 0) console.log(`Backfill de hash: ${n} registro(s).`);
}

const PORT = 4001;
// Reconstrói a cadeia de hash pendente ANTES de servir (mantém a ordem do código legado).
backfillHashes()
  .then(() => app.listen(PORT, () => console.log(`API JustSecurity rodando em http://localhost:${PORT}`)))
  .catch((e) => {
    console.error("Falha no backfill de hash no boot:", e);
    process.exit(1);
  });
