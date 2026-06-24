import "dotenv/config";
import express from "express";
import cors from "cors";
import { prisma } from "./lib/prisma.ts";
import { extractTemplate, biometriaOnline } from "./lib/biometria.ts";
import { registerDocumentos } from "./documentos.ts";
import { registerAuth } from "./auth.ts";

const app = express();
app.use(cors());
app.use(express.json({ limit: "8mb" }));

const db = prisma as any;

// Prisma 7 exige a forma de relação no create/update. Converte FKs escalares
// (`cargo_id`, `empresa_id`, ...) em `{ <rel>: { connect: { id } } }`.
// Valor vazio/null é omitido (mantém o valor atual no update).
function relationize(input: Record<string, any>): Record<string, any> {
  const data = { ...(input ?? {}) };
  for (const k of Object.keys(data)) {
    if (k.endsWith("_id")) {
      const rel = k.slice(0, -3);
      const v = data[k];
      delete data[k];
      if (v !== null && v !== undefined && v !== "") data[rel] = { connect: { id: v } };
    }
  }
  return data;
}

interface CrudOpts {
  include?: Record<string, unknown>;
  orderBy?: Record<string, "asc" | "desc">;
}

/**
 * Registra os 5 endpoints REST padrão de uma entidade-mestre.
 *   GET    /api/<path>        lista
 *   GET    /api/<path>/:id    detalha
 *   POST   /api/<path>        cria
 *   PUT    /api/<path>/:id    edita
 *   DELETE /api/<path>/:id    remove
 */
function registerCrud(path: string, model: string, opts: CrudOpts = {}) {
  const { include, orderBy = { created_at: "desc" } } = opts;

  app.get(`/api/${path}`, async (_req, res) => {
    try {
      res.json(await db[model].findMany({ include, orderBy }));
    } catch (e) {
      res.status(500).json({ error: String((e as Error).message) });
    }
  });

  app.get(`/api/${path}/:id`, async (req, res) => {
    try {
      const row = await db[model].findUnique({ where: { id: req.params.id }, include });
      if (!row) return res.status(404).json({ error: "não encontrado" });
      res.json(row);
    } catch (e) {
      res.status(500).json({ error: String((e as Error).message) });
    }
  });

  app.post(`/api/${path}`, async (req, res) => {
    try {
      res.status(201).json(await db[model].create({ data: relationize(req.body), include }));
    } catch (e) {
      res.status(400).json({ error: String((e as Error).message) });
    }
  });

  app.put(`/api/${path}/:id`, async (req, res) => {
    try {
      // não deixa o cliente sobrescrever chaves de controle
      const { id, created_at, updated_at, ...data } = req.body ?? {};
      res.json(await db[model].update({ where: { id: req.params.id }, data: relationize(data), include }));
    } catch (e) {
      res.status(400).json({ error: String((e as Error).message) });
    }
  });

  app.delete(`/api/${path}/:id`, async (req, res) => {
    try {
      await db[model].delete({ where: { id: req.params.id } });
      res.status(204).end();
    } catch (e) {
      res.status(400).json({ error: String((e as Error).message) });
    }
  });
}

app.get("/api/health", (_req, res) => res.json({ ok: true, service: "just-core" }));

// ---- Autenticação (login/me/trocar-senha). Ver skill `controle-acesso`. ----
// Obs.: a obrigatoriedade de auth nas rotas de dados entra na etapa de enforcement (Fase D),
// junto com a tela de login dos fronts — para não travar o acesso antes do login existir.
registerAuth(app);

registerCrud("empresas", "empresa", { orderBy: { razao_social: "asc" } });
registerCrud("cargos", "cargo", { orderBy: { nome: "asc" } });
registerCrud("obras", "obra", { include: { empresa: true }, orderBy: { nome: "asc" } });
registerCrud("colaboradores", "colaborador", {
  include: { cargo: true, empresa: true, alocacoes: { include: { obra: true } } },
  orderBy: { nome: "asc" },
});
registerCrud("alocacoes", "alocacao", {
  include: { colaborador: true, obra: true },
});
registerCrud("fornecedores", "fornecedor", { orderBy: { nome: "asc" } });
registerCrud("insumos", "insumo", { include: { fornecedor: true }, orderBy: { nome: "asc" } });
registerCrud("setores", "setor", { orderBy: { nome: "asc" } });
registerCrud("indicadores", "indicador", { orderBy: { nome: "asc" } });
registerCrud("tipos-documento", "tipoDocumento", { orderBy: { nome: "asc" } });
registerCrud("veiculos", "veiculo", { include: { empresa: true }, orderBy: { identificacao: "asc" } });
registerCrud("custos-cargo", "custoCargo", { orderBy: { cargo: "asc" } });

// ---- Biometria (cadastro de digitais do colaborador) ----
app.get("/api/biometria/health", async (_req, res) => {
  res.json({ online: await biometriaOnline() });
});

// Resumo: colaboradores com digitais e quantas (para a tela de cadastro).
app.get("/api/biometria/resumo", async (_req, res) => {
  const rows = await db.biometriaDigital.groupBy({
    by: ["colaborador_id"],
    _count: { _all: true },
    _max: { created_at: true },
  });
  res.json(
    rows.map((r: any) => ({ colaborador_id: r.colaborador_id, total: r._count._all, ultimo: r._max.created_at }))
  );
});

// Digitais de um colaborador (sem o template — para a UI).
app.get("/api/biometria/colaboradores/:id", async (req, res) => {
  const digitais = await db.biometriaDigital.findMany({
    where: { colaborador_id: req.params.id },
    select: { id: true, dedo: true, created_at: true },
    orderBy: { created_at: "asc" },
  });
  res.json({ colaborador_id: req.params.id, total: digitais.length, digitais });
});

// Templates de um colaborador (consumido pela verificação do JustSecurity).
app.get("/api/biometria/colaboradores/:id/templates", async (req, res) => {
  const rows = await db.biometriaDigital.findMany({
    where: { colaborador_id: req.params.id },
    select: { template: true },
  });
  res.json(rows.map((r: any) => r.template));
});

// Cadastra digitais de um dedo (1+ capturas) — extrai o template via matcher.
app.post("/api/biometria/colaboradores/:id/enroll", async (req, res) => {
  const { dedo, imagens } = req.body ?? {};
  if (!Array.isArray(imagens) || imagens.length === 0) {
    return res.status(400).json({ error: "imagens[] é obrigatório" });
  }
  try {
    let n = 0;
    for (const img of imagens) {
      const template = await extractTemplate(img);
      await db.biometriaDigital.create({ data: { colaborador_id: req.params.id, dedo: dedo ?? null, template } });
      n++;
    }
    res.status(201).json({ ok: true, cadastradas: n });
  } catch (e) {
    res.status(400).json({ error: String((e as Error).message) });
  }
});

// Remove uma digital cadastrada.
app.delete("/api/biometria/:id", async (req, res) => {
  await db.biometriaDigital.delete({ where: { id: req.params.id } });
  res.status(204).end();
});

// ---- Documentos (arquivos no storage: disco em dev, SharePoint em prod) ----
registerDocumentos(app);

const PORT = 4100;
app.listen(PORT, () => console.log(`JustCore (dados-mestre) rodando em http://localhost:${PORT}`));
