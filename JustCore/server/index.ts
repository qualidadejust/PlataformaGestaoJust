import "dotenv/config";
import express from "express";
import cors from "cors";
import { prisma } from "./lib/prisma.ts";
import { extractTemplate, biometriaOnline } from "./lib/biometria.ts";
import { registerDocumentos } from "./documentos.ts";
import { registerTriagem } from "./triagem.ts";
import { registerGate } from "./gate.ts";
import { registerFormularios } from "./formularios.ts";
import { registerAuth } from "./auth.ts";
import { registerAcessos } from "./acessos.ts";
import { registerIntegrations } from "./integrations/routes.ts";
import { requireAuth, requirePerm } from "./lib/auth.ts";

// Refino de permissão por rota. Só vale em produção (AUTH_ENFORCE), onde a global `requireAuth`
// já populou req.user; em dev (Core aberto) vira no-op para não travar o fluxo local.
const ENFORCE = process.env.AUTH_ENFORCE === "true";
const noop = (_req: any, _res: any, next: any) => next();
const perm = (chave: string) => (ENFORCE ? requirePerm(chave) : noop);

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
  /** base de permissão (ex.: "core.cadastro"): GET exige `.read`, mutações exigem `.write`. */
  perm?: string;
  /** Campos que podem ser filtrados via query params (ex.: ["obra_id", "escopo"]). Igualdade de string. */
  filterKeys?: string[];
}

/**
 * Registra os 5 endpoints REST padrão de uma entidade-mestre.
 *   GET    /api/<path>        lista (aceita ?filterKey=val para campos em filterKeys)
 *   GET    /api/<path>/:id    detalha
 *   POST   /api/<path>        cria
 *   PUT    /api/<path>/:id    edita
 *   DELETE /api/<path>/:id    remove
 */
function registerCrud(path: string, model: string, opts: CrudOpts = {}) {
  const { include, orderBy = { created_at: "desc" }, perm: base, filterKeys = [] } = opts;
  const ler = base ? perm(`${base}.read`) : noop;
  const escrever = base ? perm(`${base}.write`) : noop;

  app.get(`/api/${path}`, ler, async (req, res) => {
    try {
      const where: Record<string, any> = {};
      for (const k of filterKeys) {
        const v = req.query[k];
        if (v !== undefined) where[k] = String(v);
      }
      res.json(await db[model].findMany({ include, orderBy, where: Object.keys(where).length ? where : undefined }));
    } catch (e) {
      res.status(500).json({ error: String((e as Error).message) });
    }
  });

  app.get(`/api/${path}/:id`, ler, async (req, res) => {
    try {
      const row = await db[model].findUnique({ where: { id: req.params.id }, include });
      if (!row) return res.status(404).json({ error: "não encontrado" });
      res.json(row);
    } catch (e) {
      res.status(500).json({ error: String((e as Error).message) });
    }
  });

  app.post(`/api/${path}`, escrever, async (req, res) => {
    try {
      res.status(201).json(await db[model].create({ data: relationize(req.body), include }));
    } catch (e) {
      res.status(400).json({ error: String((e as Error).message) });
    }
  });

  app.put(`/api/${path}/:id`, escrever, async (req, res) => {
    try {
      // não deixa o cliente sobrescrever chaves de controle
      const { id, created_at, updated_at, ...data } = req.body ?? {};
      res.json(await db[model].update({ where: { id: req.params.id }, data: relationize(data), include }));
    } catch (e) {
      res.status(400).json({ error: String((e as Error).message) });
    }
  });

  app.delete(`/api/${path}/:id`, escrever, async (req, res) => {
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
registerAuth(app);

// ---- Gestão de acesso (usuários/perfis/permissões/logs) — protegida por `acesso.admin`. ----
registerAcessos(app);

// ENFORCEMENT (Fase D): com AUTH_ENFORCE=true (produção), TODA rota registrada a partir daqui
// exige token — JWT do usuário (front) OU x-internal-token (chamadas app->Core). /api/health e
// /api/auth/* ficam acima, públicos. Em dev (sem a flag) não enforça, p/ não travar o fluxo local.
if (process.env.AUTH_ENFORCE === "true") {
  app.use(requireAuth);
  console.log("[auth] enforcement ATIVO — rotas de dados exigem token.");
}

// Todos os cadastros-mestre do Core compartilham a permissão `core.cadastro` (read/write).
registerCrud("empresas", "empresa", { orderBy: { razao_social: "asc" }, perm: "core.cadastro" });
registerCrud("cargos", "cargo", { orderBy: { nome: "asc" }, perm: "core.cadastro" });
registerCrud("obras", "obra", { include: { empresa: true }, orderBy: { nome: "asc" }, perm: "core.cadastro" });
registerCrud("colaboradores", "colaborador", {
  include: { cargo: true, empresa: true, alocacoes: { include: { obra: true } } },
  orderBy: { nome: "asc" },
  perm: "core.cadastro",
});
registerCrud("alocacoes", "alocacao", {
  include: { colaborador: true, obra: true },
  perm: "core.cadastro",
});
registerCrud("fornecedores", "fornecedor", { orderBy: { nome: "asc" }, perm: "core.cadastro" });
registerCrud("insumos", "insumo", { include: { fornecedor: true }, orderBy: { nome: "asc" }, perm: "core.cadastro" });
registerCrud("setores", "setor", { orderBy: { nome: "asc" }, perm: "core.cadastro" });
registerCrud("indicadores", "indicador", { orderBy: { nome: "asc" }, perm: "core.cadastro" });
registerCrud("tipos-documento", "tipoDocumento", { orderBy: { nome: "asc" }, perm: "core.cadastro" });
registerCrud("veiculos", "veiculo", { include: { empresa: true }, orderBy: { identificacao: "asc" }, perm: "core.cadastro" });
registerCrud("custos-cargo", "custoCargo", { orderBy: { cargo: "asc" }, perm: "core.cadastro" });
// Vistoria & Entrega: cadastro-mestre (comprador + unidade física). Transações ficam no JustVistoria.
registerCrud("clientes", "cliente", { orderBy: { nome: "asc" }, perm: "core.cadastro" });
registerCrud("unidades", "unidade", { include: { obra: true, cliente: true }, orderBy: { identificador: "asc" }, perm: "core.cadastro" });

// ---- Motor de formulários (base transversal) — catálogo simples + módulo de templates/instâncias ----
registerCrud("formulario-tipos", "formularioTipo", { orderBy: { nome: "asc" }, perm: "core.cadastro" });
registerCrud("formulario-grupos", "formularioGrupo", { orderBy: { nome: "asc" }, perm: "core.cadastro" });

// ---- Biometria (cadastro de digitais do colaborador) ----
app.get("/api/biometria/health", async (_req, res) => {
  res.json({ online: await biometriaOnline() });
});

// Resumo: colaboradores com digitais e quantas (para a tela de cadastro).
app.get("/api/biometria/resumo", perm("core.cadastro.read"), async (_req, res) => {
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
app.get("/api/biometria/colaboradores/:id", perm("core.cadastro.read"), async (req, res) => {
  const digitais = await db.biometriaDigital.findMany({
    where: { colaborador_id: req.params.id },
    select: { id: true, dedo: true, created_at: true },
    orderBy: { created_at: "asc" },
  });
  res.json({ colaborador_id: req.params.id, total: digitais.length, digitais });
});

// Templates de um colaborador (consumido pela verificação do JustSecurity via x-internal-token,
// que tem bypass). Para humanos, é dado biométrico sensível → exige core.sensivel.read.
app.get("/api/biometria/colaboradores/:id/templates", perm("core.sensivel.read"), async (req, res) => {
  const rows = await db.biometriaDigital.findMany({
    where: { colaborador_id: req.params.id },
    select: { template: true },
  });
  res.json(rows.map((r: any) => r.template));
});

// Cadastra digitais de um dedo (1+ capturas) — extrai o template via matcher.
app.post("/api/biometria/colaboradores/:id/enroll", perm("core.cadastro.write"), async (req, res) => {
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
app.delete("/api/biometria/:id", perm("core.cadastro.write"), async (req, res) => {
  await db.biometriaDigital.delete({ where: { id: req.params.id } });
  res.status(204).end();
});

// ---- Documentos (arquivos no storage: disco em dev, SharePoint em prod) ----
// GED: leitura exige ged.documento.read; envio/remoção ged.documento.write; baixar sensível
// (ASO/atestado/CID) exige ged.sensivel.read e é registrado na auditoria.
registerDocumentos(app, perm);

// ---- Triagem por IA (Gemini): lê o arquivo e PROPÕE a classificação no GED (não grava) ----
registerTriagem(app, perm);

// ---- JustGate (WhatsApp): proposta pendente → confirma → grava na fila de análise do GED ----
registerGate(app, perm);

// ---- Motor de formulários: templates versionados + instâncias (consumido por todos os apps) ----
registerFormularios(app, perm);

// ---- Backbone: locais, serviços, tarefas (dados-mestre do cronograma/LBS) ----
registerCrud("locais", "local", {
  include: { obra: true },
  orderBy: { zona: "asc" },
  perm: "core.cadastro",
  filterKeys: ["obra_id", "zona", "pavimento"],
});
registerCrud("servicos", "servico", { orderBy: { sigla_prancha: "asc" }, perm: "core.cadastro" });
registerCrud("tarefas", "tarefa", {
  include: { local: true, servico: true },
  orderBy: { baseline_inicio: "asc" },
  perm: "core.cadastro",
  filterKeys: ["obra_id", "local_id", "servico_id", "critico"],
});

// ---- ACL Prevision/Sienge: sync + status endpoints ----
registerIntegrations(app, perm);

const PORT = 4100;
app.listen(PORT, () => console.log(`JustCore (dados-mestre) rodando em http://localhost:${PORT}`));
