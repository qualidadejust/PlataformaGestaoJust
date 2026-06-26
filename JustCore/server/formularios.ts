// MOTOR DE FORMULÁRIOS — rotas do Core (base de cadastro transversal, como o GED).
//
//   Catálogo (cadastros simples, via registerCrud no index.ts):
//     /api/formulario-tipos      tipos de formulário (FVS, FVE, AVF…)
//     /api/formulario-grupos     grupos de inspeção / disciplinas
//
//   Templates (versionados) — aqui:
//     GET    /api/formularios                 lista modelos (filtros: escopo, codigo, ativo, publicado)
//     GET    /api/formularios/:id              detalha (com tipo/grupo)
//     POST   /api/formularios                  cria modelo (rascunho, versão 1)
//     PUT    /api/formularios/:id              edita (bloqueia estrutura de modelo já aplicado)
//     POST   /api/formularios/:id/publicar     publica (passa a ser aplicável)
//     POST   /api/formularios/:id/nova-versao  clona como versão+1 (rascunho)
//     POST   /api/formularios/:id/duplicar     clona como novo código (rascunho)
//     DELETE /api/formularios/:id              remove (só sem instâncias)
//
//   Instâncias (preenchimentos) — polimórficas (entidade_tipo+entidade_id):
//     GET    /api/formularios/instancias       lista (filtros: escopo, modelo_codigo, entidade_*)
//     GET    /api/formularios/instancias/:id
//     POST   /api/formularios/instancias        cria (congela versão/escopo do modelo)
//     PUT    /api/formularios/instancias/:id
//
// Ver skill `motor-formularios` e seção 14 do resumo.
import type { Express, RequestHandler } from "express";
import { prisma } from "./lib/prisma.ts";

const db = prisma as any;
type Perm = (chave: string) => RequestHandler;

export function registerFormularios(app: Express, perm: Perm) {
  const ler = perm("formularios.read");
  const escrever = perm("formularios.write");

  // ---- Instâncias: registradas ANTES de /:id para não colidir com "instancias" ----
  app.get("/api/formularios/instancias", ler, async (req, res) => {
    try {
      const where: any = {};
      if (req.query.escopo) where.escopo = String(req.query.escopo);
      if (req.query.modelo_codigo) where.modelo_codigo = String(req.query.modelo_codigo);
      if (req.query.entidade_tipo) where.entidade_tipo = String(req.query.entidade_tipo);
      if (req.query.entidade_id) where.entidade_id = String(req.query.entidade_id);
      res.json(await db.formularioInstancia.findMany({ where, orderBy: { created_at: "desc" } }));
    } catch (e) {
      res.status(500).json({ error: String((e as Error).message) });
    }
  });

  app.get("/api/formularios/instancias/:id", ler, async (req, res) => {
    try {
      const row = await db.formularioInstancia.findUnique({ where: { id: req.params.id }, include: { modelo: true } });
      if (!row) return res.status(404).json({ error: "não encontrada" });
      res.json(row);
    } catch (e) {
      res.status(500).json({ error: String((e as Error).message) });
    }
  });

  app.post("/api/formularios/instancias", escrever, async (req, res) => {
    try {
      const b = req.body ?? {};
      const modelo = await db.formularioModelo.findUnique({ where: { id: b.modelo_id } });
      if (!modelo) return res.status(400).json({ error: "modelo_id inválido." });
      const inst = await db.formularioInstancia.create({
        data: {
          modelo_id: modelo.id,
          modelo_codigo: modelo.codigo, // congela
          modelo_versao: modelo.versao, // congela
          escopo: modelo.escopo,
          entidade_tipo: b.entidade_tipo ?? modelo.entidade_alvo ?? null,
          entidade_id: b.entidade_id ?? null,
          entidade_label: b.entidade_label ?? null,
          respostas: typeof b.respostas === "string" ? b.respostas : JSON.stringify(b.respostas ?? []),
          nota: b.nota ?? null,
          total_nc: b.total_nc ?? 0,
          resumo: b.resumo ? (typeof b.resumo === "string" ? b.resumo : JSON.stringify(b.resumo)) : null,
          autor_id: b.autor_id ?? null,
          autor_nome: b.autor_nome ?? null,
          assinaturas: b.assinaturas ? (typeof b.assinaturas === "string" ? b.assinaturas : JSON.stringify(b.assinaturas)) : null,
          preenchido_em: b.preenchido_em ? new Date(b.preenchido_em) : new Date(),
        },
      });
      res.status(201).json(inst);
    } catch (e) {
      res.status(400).json({ error: String((e as Error).message) });
    }
  });

  app.put("/api/formularios/instancias/:id", escrever, async (req, res) => {
    try {
      const { id, created_at, updated_at, modelo, modelo_id, modelo_codigo, modelo_versao, ...rest } = req.body ?? {};
      const data: any = { ...rest };
      for (const k of ["respostas", "resumo", "assinaturas"]) if (data[k] && typeof data[k] !== "string") data[k] = JSON.stringify(data[k]);
      if (data.preenchido_em) data.preenchido_em = new Date(data.preenchido_em);
      res.json(await db.formularioInstancia.update({ where: { id: req.params.id }, data }));
    } catch (e) {
      res.status(400).json({ error: String((e as Error).message) });
    }
  });

  // ---- Modelos (templates) ----
  app.get("/api/formularios", ler, async (req, res) => {
    try {
      const where: any = {};
      if (req.query.escopo) where.escopo = String(req.query.escopo);
      if (req.query.codigo) where.codigo = String(req.query.codigo);
      if (req.query.ativo) where.ativo = req.query.ativo === "true";
      if (req.query.publicado) where.publicado = req.query.publicado === "true";
      res.json(await db.formularioModelo.findMany({ where, include: { tipo: true, grupo: true }, orderBy: [{ codigo: "asc" }, { versao: "desc" }] }));
    } catch (e) {
      res.status(500).json({ error: String((e as Error).message) });
    }
  });

  app.get("/api/formularios/:id", ler, async (req, res) => {
    try {
      const row = await db.formularioModelo.findUnique({ where: { id: req.params.id }, include: { tipo: true, grupo: true } });
      if (!row) return res.status(404).json({ error: "não encontrado" });
      res.json(row);
    } catch (e) {
      res.status(500).json({ error: String((e as Error).message) });
    }
  });

  app.post("/api/formularios", escrever, async (req, res) => {
    try {
      const b = req.body ?? {};
      if (!b.codigo || !b.nome) return res.status(400).json({ error: "codigo e nome são obrigatórios." });
      const row = await db.formularioModelo.create({ data: normalizeModelo(b, { versao: 1, publicado: false }), include: { tipo: true, grupo: true } });
      res.status(201).json(row);
    } catch (e) {
      res.status(400).json({ error: String((e as Error).message) });
    }
  });

  app.put("/api/formularios/:id", escrever, async (req, res) => {
    try {
      const atual = await db.formularioModelo.findUnique({ where: { id: req.params.id }, include: { _count: { select: { instancias: true } } } });
      if (!atual) return res.status(404).json({ error: "não encontrado" });
      const { id, created_at, updated_at, tipo, grupo, instancias, _count, ...rest } = req.body ?? {};
      // modelo já aplicado (com instâncias): não pode mudar a estrutura/regras — versione.
      if (atual._count.instancias > 0 && rest.estrutura !== undefined) {
        return res.status(409).json({ error: "Modelo já aplicado. Crie uma nova versão para alterar a estrutura.", instancias: atual._count.instancias });
      }
      res.json(await db.formularioModelo.update({ where: { id: req.params.id }, data: normalizeModelo(rest, {}), include: { tipo: true, grupo: true } }));
    } catch (e) {
      res.status(400).json({ error: String((e as Error).message) });
    }
  });

  app.post("/api/formularios/:id/publicar", escrever, async (req, res) => {
    try {
      res.json(await db.formularioModelo.update({ where: { id: req.params.id }, data: { publicado: true, ativo: true } }));
    } catch (e) {
      res.status(400).json({ error: String((e as Error).message) });
    }
  });

  app.post("/api/formularios/:id/nova-versao", escrever, async (req, res) => {
    try {
      const base = await db.formularioModelo.findUnique({ where: { id: req.params.id } });
      if (!base) return res.status(404).json({ error: "não encontrado" });
      const { id, created_at, updated_at, versao, publicado, ...campos } = base;
      const nova = await db.formularioModelo.create({ data: { ...campos, versao: versao + 1, publicado: false }, include: { tipo: true, grupo: true } });
      res.status(201).json(nova);
    } catch (e) {
      res.status(400).json({ error: String((e as Error).message) });
    }
  });

  app.post("/api/formularios/:id/duplicar", escrever, async (req, res) => {
    try {
      const base = await db.formularioModelo.findUnique({ where: { id: req.params.id } });
      if (!base) return res.status(404).json({ error: "não encontrado" });
      const { id, created_at, updated_at, codigo, nome, publicado, versao, ...campos } = base;
      const novoCodigo = req.body?.codigo || `${codigo}_COPIA`;
      const nova = await db.formularioModelo.create({
        data: { ...campos, codigo: novoCodigo, nome: req.body?.nome || `${nome} (cópia)`, versao: 1, publicado: false },
        include: { tipo: true, grupo: true },
      });
      res.status(201).json(nova);
    } catch (e) {
      res.status(400).json({ error: String((e as Error).message) });
    }
  });

  app.delete("/api/formularios/:id", escrever, async (req, res) => {
    try {
      const n = await db.formularioInstancia.count({ where: { modelo_id: req.params.id } });
      if (n > 0) return res.status(409).json({ error: "Modelo com instâncias preenchidas — inative em vez de excluir.", instancias: n });
      await db.formularioModelo.delete({ where: { id: req.params.id } });
      res.status(204).end();
    } catch (e) {
      res.status(400).json({ error: String((e as Error).message) });
    }
  });
}

/** Normaliza payload do modelo: FK escalares e JSON (config/estrutura) como String. */
function normalizeModelo(b: Record<string, any>, defaults: Record<string, any>) {
  const data: any = { ...b, ...defaults };
  for (const k of ["config", "estrutura"]) if (data[k] !== undefined && data[k] !== null && typeof data[k] !== "string") data[k] = JSON.stringify(data[k]);
  // FKs: aceitam tipo_id/grupo_id direto (colunas escalares no schema) — mantém como está.
  return data;
}
