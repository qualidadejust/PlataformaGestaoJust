// Gestão de acesso (admin): usuários, perfis (RBAC), permissões e trilha de auditoria.
// Tudo protegido por `acesso.admin` (em produção, com AUTH_ENFORCE). Ver skill `controle-acesso`.
//   GET  /api/acessos/permissoes                catálogo de permissões
//   GET  /api/acessos/perfis                    perfis + chaves de permissão
//   POST/PUT/DELETE /api/acessos/perfis[/:id]   gerencia perfis e suas permissões
//   GET  /api/acessos/usuarios                  usuários + perfis + colaborador
//   POST/PUT/DELETE /api/acessos/usuarios[/:id] cria/edita/remove usuário
//   POST /api/acessos/usuarios/:id/resetar-senha gera nova senha temporária
//   GET  /api/acessos/logs                      últimos acessos (auditoria LGPD)
import type { Express, Request } from "express";
import { randomBytes } from "node:crypto";
import { prisma } from "./lib/prisma.ts";
import { hashSenha, logAcesso, requireAuth, requirePerm, type TokenPayload } from "./lib/auth.ts";

const db = prisma as any;
const ENFORCE = process.env.AUTH_ENFORCE === "true";

// Em produção (enforce) a global `requireAuth` já roda antes; aqui só refinamos a permissão.
// Em dev (sem enforce) o Core fica aberto, como as demais telas — guarda vira no-op.
const guard = ENFORCE ? [requireAuth, requirePerm("acesso.admin")] : [];

const ipDe = (req: Request) =>
  (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() || req.socket.remoteAddress || undefined;
const atorDe = (req: Request) => ((req as any).user as TokenPayload | undefined)?.sub ?? null;

/** Senha temporária legível e forte o bastante p/ uso único (troca obrigatória no 1º acesso). */
const gerarSenhaTemporaria = () => "Just-" + randomBytes(6).toString("base64url");

export function registerAcessos(app: Express) {
  // ---- Catálogo de permissões ----
  app.get("/api/acessos/permissoes", ...guard, async (_req, res) => {
    res.json(await db.permissao.findMany({ orderBy: { chave: "asc" } }));
  });

  // ---- Perfis (com as chaves de permissão de cada um) ----
  app.get("/api/acessos/perfis", ...guard, async (_req, res) => {
    const perfis = await db.perfil.findMany({
      orderBy: { nome: "asc" },
      include: { permissoes: { include: { permissao: true } }, _count: { select: { usuarios: true } } },
    });
    res.json(
      perfis.map((p: any) => ({
        id: p.id,
        nome: p.nome,
        descricao: p.descricao,
        ativo: p.ativo,
        usuarios: p._count.usuarios,
        chaves: p.permissoes.map((pp: any) => pp.permissao.chave),
      }))
    );
  });

  app.post("/api/acessos/perfis", ...guard, async (req, res) => {
    try {
      const { nome, descricao, chaves } = req.body ?? {};
      if (!nome) return res.status(400).json({ error: "nome é obrigatório" });
      const perfil = await db.perfil.create({ data: { nome: String(nome).trim(), descricao: descricao ?? null } });
      await sincronizarPermissoes(perfil.id, chaves);
      await logAcesso(atorDe(req), "perfil_criado", { recurso: "acesso.perfil", entidade_id: perfil.id, ip: ipDe(req) });
      res.status(201).json({ id: perfil.id });
    } catch (e) {
      res.status(400).json({ error: String((e as Error).message) });
    }
  });

  app.put("/api/acessos/perfis/:id", ...guard, async (req, res) => {
    try {
      const { nome, descricao, ativo, chaves } = req.body ?? {};
      const data: Record<string, any> = {};
      if (nome !== undefined) data.nome = String(nome).trim();
      if (descricao !== undefined) data.descricao = descricao;
      if (ativo !== undefined) data.ativo = !!ativo;
      if (Object.keys(data).length) await db.perfil.update({ where: { id: req.params.id }, data });
      if (Array.isArray(chaves)) await sincronizarPermissoes(req.params.id, chaves);
      await logAcesso(atorDe(req), "perfil_editado", { recurso: "acesso.perfil", entidade_id: req.params.id, ip: ipDe(req) });
      res.json({ ok: true });
    } catch (e) {
      res.status(400).json({ error: String((e as Error).message) });
    }
  });

  app.delete("/api/acessos/perfis/:id", ...guard, async (req, res) => {
    try {
      const perfil = await db.perfil.findUnique({ where: { id: req.params.id } });
      if (perfil?.nome === "admin") return res.status(400).json({ error: "o perfil admin não pode ser removido" });
      await db.perfil.delete({ where: { id: req.params.id } });
      await logAcesso(atorDe(req), "perfil_removido", { recurso: "acesso.perfil", entidade_id: req.params.id, ip: ipDe(req) });
      res.status(204).end();
    } catch (e) {
      res.status(400).json({ error: String((e as Error).message) });
    }
  });

  // ---- Usuários ----
  app.get("/api/acessos/usuarios", ...guard, async (_req, res) => {
    const usuarios = await db.usuario.findMany({
      orderBy: { email: "asc" },
      include: {
        colaborador: { select: { id: true, nome: true } },
        perfis: { include: { perfil: { select: { id: true, nome: true } } } },
      },
    });
    res.json(
      usuarios.map((u: any) => ({
        id: u.id,
        email: u.email,
        ativo: u.ativo,
        senha_temporaria: u.senha_temporaria,
        ultimo_login: u.ultimo_login,
        colaborador: u.colaborador,
        perfis: u.perfis.map((p: any) => p.perfil),
      }))
    );
  });

  app.post("/api/acessos/usuarios", ...guard, async (req, res) => {
    try {
      const { email, colaborador_id, perfis } = req.body ?? {};
      if (!email) return res.status(400).json({ error: "email é obrigatório" });
      const emailNorm = String(email).toLowerCase().trim();
      const existe = await db.usuario.findUnique({ where: { email: emailNorm } });
      if (existe) return res.status(400).json({ error: "já existe um usuário com esse e-mail" });
      const senha = gerarSenhaTemporaria();
      const usuario = await db.usuario.create({
        data: {
          email: emailNorm,
          senha_hash: await hashSenha(senha),
          colaborador_id: colaborador_id || null,
          ativo: true,
          senha_temporaria: true,
        },
      });
      await sincronizarPerfis(usuario.id, perfis);
      await logAcesso(atorDe(req), "usuario_criado", { recurso: "acesso.usuario", entidade_id: usuario.id, ip: ipDe(req) });
      // a senha temporária só é exibida UMA vez para o admin repassar.
      res.status(201).json({ id: usuario.id, email: emailNorm, senha_temporaria: senha });
    } catch (e) {
      res.status(400).json({ error: String((e as Error).message) });
    }
  });

  app.put("/api/acessos/usuarios/:id", ...guard, async (req, res) => {
    try {
      const { ativo, colaborador_id, perfis } = req.body ?? {};
      const data: Record<string, any> = {};
      if (ativo !== undefined) data.ativo = !!ativo;
      if (colaborador_id !== undefined) data.colaborador_id = colaborador_id || null;
      if (Object.keys(data).length) await db.usuario.update({ where: { id: req.params.id }, data });
      if (Array.isArray(perfis)) await sincronizarPerfis(req.params.id, perfis);
      await logAcesso(atorDe(req), "usuario_editado", { recurso: "acesso.usuario", entidade_id: req.params.id, ip: ipDe(req) });
      res.json({ ok: true });
    } catch (e) {
      res.status(400).json({ error: String((e as Error).message) });
    }
  });

  app.post("/api/acessos/usuarios/:id/resetar-senha", ...guard, async (req, res) => {
    try {
      const senha = gerarSenhaTemporaria();
      await db.usuario.update({
        where: { id: req.params.id },
        data: { senha_hash: await hashSenha(senha), senha_temporaria: true },
      });
      await logAcesso(atorDe(req), "senha_resetada", { recurso: "acesso.usuario", entidade_id: req.params.id, ip: ipDe(req) });
      res.json({ senha_temporaria: senha });
    } catch (e) {
      res.status(400).json({ error: String((e as Error).message) });
    }
  });

  app.delete("/api/acessos/usuarios/:id", ...guard, async (req, res) => {
    try {
      const ator = atorDe(req);
      if (ator && ator === req.params.id) return res.status(400).json({ error: "você não pode remover o próprio usuário" });
      await db.usuario.delete({ where: { id: req.params.id } });
      await logAcesso(ator, "usuario_removido", { recurso: "acesso.usuario", entidade_id: req.params.id, ip: ipDe(req) });
      res.status(204).end();
    } catch (e) {
      res.status(400).json({ error: String((e as Error).message) });
    }
  });

  // ---- Auditoria (últimos acessos) ----
  app.get("/api/acessos/logs", ...guard, async (req, res) => {
    const limite = Math.min(Number(req.query.limite) || 100, 500);
    const logs = await db.logAcesso.findMany({
      orderBy: { created_at: "desc" },
      take: limite,
      include: { usuario: { select: { email: true } } },
    });
    res.json(
      logs.map((l: any) => ({
        id: l.id,
        acao: l.acao,
        recurso: l.recurso,
        entidade_id: l.entidade_id,
        ip: l.ip,
        sucesso: l.sucesso,
        created_at: l.created_at,
        email: l.usuario?.email ?? null,
      }))
    );
  });
}

/** Substitui as permissões de um perfil pelas chaves dadas (deleteMany + create). */
async function sincronizarPermissoes(perfil_id: string, chaves: unknown) {
  if (!Array.isArray(chaves)) return;
  await db.perfilPermissao.deleteMany({ where: { perfil_id } });
  if (!chaves.length) return;
  const perms = await db.permissao.findMany({ where: { chave: { in: chaves } }, select: { id: true } });
  await db.perfilPermissao.createMany({
    data: perms.map((p: any) => ({ perfil_id, permissao_id: p.id })),
    skipDuplicates: true,
  });
}

/** Substitui os perfis de um usuário pelos ids dados (deleteMany + create). */
async function sincronizarPerfis(usuario_id: string, perfis: unknown) {
  if (!Array.isArray(perfis)) return;
  await db.usuarioPerfil.deleteMany({ where: { usuario_id } });
  if (!perfis.length) return;
  await db.usuarioPerfil.createMany({
    data: perfis.map((perfil_id: string) => ({ usuario_id, perfil_id })),
    skipDuplicates: true,
  });
}
