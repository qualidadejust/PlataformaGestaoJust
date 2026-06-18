import express from "express";
import cors from "cors";
import { prisma } from "./lib/prisma.ts";

const app = express();
app.use(cors());
app.use(express.json({ limit: "2mb" }));

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

const PORT = 4100;
app.listen(PORT, () => console.log(`JustCore (dados-mestre) rodando em http://localhost:${PORT}`));
