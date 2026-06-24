// JustAtestados — backend (Express + Prisma/Postgres). Guarda só a transação (atestado/
// declaração) e referencia o Core (colaborador/obra) com snapshot. O anexo vai pro GED do
// Core (sensível). Cadastro NÃO é duplicado aqui. Ver skill `controle-acesso` e o resumo.
import "dotenv/config";
import express from "express";
import cors from "cors";
import multer from "multer";
import { prisma } from "./lib/prisma.ts";
import { requireAuth, requirePerm } from "./lib/auth.ts";
import { gedUpload } from "./core.ts";

const app = express();
app.use(cors());
app.use(express.json({ limit: "2mb" }));
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 25 * 1024 * 1024 } });

const db = prisma as any;
const hoje = () => new Date().toISOString().slice(0, 10);

app.get("/api/health", (_req, res) => res.json({ ok: true, service: "just-atestados" }));

// Enforcement (produção): tudo a partir daqui exige token; cada rota refina a permissão.
app.use(requireAuth);

// Gera ticket sequencial legível (RM-####). Base 1000 + total existente.
async function novoTicket(): Promise<string> {
  const n = await db.atestado.count();
  return `RM-${1000 + n + 1}`;
}

async function logEvento(usuario: string | undefined, acao: string, modulo: string, detalhe: string) {
  try {
    await db.eventoAtestado.create({ data: { usuario: usuario ?? null, acao, modulo, detalhe } });
  } catch {
    /* auditoria não derruba a request */
  }
}

// Campos aceitos do corpo (multipart manda tudo como string — normaliza números).
function montarDados(b: Record<string, any>) {
  const num = (v: any) => (v === undefined || v === null || v === "" ? null : Number(v));
  return {
    tipo: b.tipo ?? "atestado",
    colaborador_id: b.colaborador_id || null,
    colaborador_nome: b.colaborador_nome || null,
    matricula: b.matricula || null,
    cargo: b.cargo || null,
    setor: b.setor || null,
    gestor: b.gestor || null,
    obra_id: b.obra_id || null,
    obra_nome: b.obra_nome || null,
    obra_uf: b.obra_uf || null,
    centro_custo: b.centro_custo || null,
    data_lancamento: b.data_lancamento || hoje(),
    apontador_id: b.apontador_id || null,
    apontador_nome: b.apontador_nome || null,
    data_emissao: b.data_emissao || null,
    dias: num(b.dias),
    cid_codigo: b.cid_codigo || null,
    cid_descricao: b.cid_descricao || null,
    medico_nome: b.medico_nome || null,
    medico_crm: b.medico_crm || null,
    data_comparecimento: b.data_comparecimento || null,
    periodo: b.periodo || null,
    hora_inicio: b.hora_inicio || null,
    hora_fim: b.hora_fim || null,
    horas: num(b.horas),
    local: b.local || null,
    origem: b.origem || "manual",
  };
}

// ---- Listagem / consulta ----
app.get("/api/atestados", requirePerm("atestados.read"), async (req, res) => {
  try {
    const { busca, obra_id, cargo, cid, tipo, status, dataInicio, dataFim, colaborador_id, apontador_id } =
      req.query as Record<string, string | undefined>;
    const where: any = {};
    if (obra_id) where.obra_id = obra_id;
    if (colaborador_id) where.colaborador_id = colaborador_id;
    if (apontador_id) where.apontador_id = apontador_id;
    if (cargo) where.cargo = cargo;
    if (cid) where.cid_codigo = cid;
    if (tipo) where.tipo = tipo;
    if (status) where.status = status;
    if (dataInicio || dataFim)
      where.data_lancamento = { ...(dataInicio ? { gte: dataInicio } : {}), ...(dataFim ? { lte: dataFim } : {}) };
    if (busca)
      where.OR = [
        { colaborador_nome: { contains: busca, mode: "insensitive" } },
        { matricula: { contains: busca, mode: "insensitive" } },
        { ticket: { contains: busca, mode: "insensitive" } },
        { motivo: { contains: busca, mode: "insensitive" } },
      ];
    res.json(await db.atestado.findMany({ where, orderBy: { created_at: "desc" } }));
  } catch (e) {
    res.status(500).json({ error: String((e as Error).message) });
  }
});

app.get("/api/atestados/:id", requirePerm("atestados.read"), async (req, res) => {
  const row = await db.atestado.findUnique({ where: { id: req.params.id } });
  if (!row) return res.status(404).json({ error: "não encontrado" });
  res.json(row);
});

// ---- Lançamento (apontador/RH) ----
app.post("/api/atestados", requirePerm("atestados.write"), upload.single("file"), async (req, res) => {
  try {
    const dados = montarDados(req.body ?? {});
    const ticket = await novoTicket();
    let atestado = await db.atestado.create({ data: { ...dados, ticket, status: "pendente" } });

    // anexo (opcional) → GED do Core, sensível
    const f = (req as any).file as Express.Multer.File | undefined;
    if (f && atestado.colaborador_id) {
      const ged = await gedUpload({
        buffer: f.buffer,
        filename: f.originalname,
        contentType: f.mimetype,
        colaborador_id: atestado.colaborador_id,
        colaborador_nome: atestado.colaborador_nome ?? undefined,
        categoria: atestado.tipo === "declaracao" ? "declaracao" : "atestado",
      });
      if (ged)
        atestado = await db.atestado.update({
          where: { id: atestado.id },
          data: { ged_documento_id: ged.id, anexo_nome: ged.nome },
        });
    }
    await logEvento(dados.apontador_nome ?? undefined, "Lançamento", "Novo Lançamento", `${ticket} (${dados.tipo})`);
    res.status(201).json(atestado);
  } catch (e) {
    res.status(400).json({ error: String((e as Error).message) });
  }
});

// ---- Edição genérica (patch) ----
app.put("/api/atestados/:id", requirePerm("atestados.write"), async (req, res) => {
  try {
    const { id, created_at, updated_at, ticket, ...patch } = req.body ?? {};
    const row = await db.atestado.update({ where: { id: req.params.id }, data: patch });
    res.json(row);
  } catch (e) {
    res.status(400).json({ error: String((e as Error).message) });
  }
});

// ---- Decisão do RH (aprovar / reprovar) ----
app.post("/api/atestados/:id/aprovar", requirePerm("atestados.aprovar"), async (req, res) => {
  try {
    const { analista } = req.body ?? {};
    const row = await db.atestado.update({
      where: { id: req.params.id },
      data: { status: "aprovado", data_analise: hoje(), analista: analista || null, motivo: null },
    });
    await logEvento(analista, "Aprovação", "Fila de Análise", row.ticket);
    res.json(row);
  } catch (e) {
    res.status(400).json({ error: String((e as Error).message) });
  }
});

app.post("/api/atestados/:id/reprovar", requirePerm("atestados.aprovar"), async (req, res) => {
  try {
    const { analista, motivo } = req.body ?? {};
    if (!motivo) return res.status(400).json({ error: "motivo é obrigatório ao recusar" });
    const row = await db.atestado.update({
      where: { id: req.params.id },
      data: { status: "reprovado", data_analise: hoje(), analista: analista || null, motivo },
    });
    await logEvento(analista, "Recusa", "Fila de Análise", `${row.ticket}: ${motivo}`);
    res.json(row);
  } catch (e) {
    res.status(400).json({ error: String((e as Error).message) });
  }
});

app.delete("/api/atestados/:id", requirePerm("atestados.aprovar"), async (req, res) => {
  try {
    await db.atestado.delete({ where: { id: req.params.id } });
    res.status(204).end();
  } catch (e) {
    res.status(400).json({ error: String((e as Error).message) });
  }
});

// ---- Resumo da fila (cartões do topo) ----
app.get("/api/resumo-fila", requirePerm("atestados.read"), async (_req, res) => {
  const [pendentes, inconsistentes, aprovadosHoje] = await Promise.all([
    db.atestado.count({ where: { status: "pendente" } }),
    db.atestado.count({ where: { status: "inconsistente" } }),
    db.atestado.count({ where: { status: "aprovado", data_analise: hoje() } }),
  ]);
  res.json({ pendentes, inconsistentes, aprovadosHoje });
});

// ---- KPIs (sobre os aprovados) ----
app.get("/api/kpis", requirePerm("atestados.read"), async (req, res) => {
  const { dataInicio, dataFim } = req.query as Record<string, string | undefined>;
  const where: any = { status: "aprovado" };
  if (dataInicio || dataFim)
    where.data_lancamento = { ...(dataInicio ? { gte: dataInicio } : {}), ...(dataFim ? { lte: dataFim } : {}) };
  const aprovados = await db.atestado.findMany({ where });
  const total = await db.atestado.count();
  const diasPerdidos = aprovados.reduce((s: number, a: any) => s + (a.dias ?? 0), 0);
  const horasPerdidas = aprovados.reduce((s: number, a: any) => s + (a.horas ?? 0), 0);
  res.json({ total, aprovados: aprovados.length, diasPerdidos, horasPerdidas });
});

// ---- Auditoria ----
app.get("/api/eventos", requirePerm("atestados.read"), async (req, res) => {
  const limite = Math.min(Number(req.query.limite) || 100, 500);
  res.json(await db.eventoAtestado.findMany({ orderBy: { created_at: "desc" }, take: limite }));
});

const PORT = Number(process.env.PORT ?? 4700);
app.listen(PORT, () => console.log(`JustAtestados rodando em http://localhost:${PORT}`));
