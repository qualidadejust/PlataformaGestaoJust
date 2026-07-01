// Rotas de autenticação do Core. Ver skill `controle-acesso`.
//   POST /api/auth/login          { email, senha } -> { token, usuario }
//   GET  /api/auth/me             (Bearer) -> usuário atual (perfis/permissões frescos)
//   POST /api/auth/trocar-senha   (Bearer) { senha_atual, nova_senha }
import type { Express, Request } from "express";
import { prisma } from "./lib/prisma.ts";
import { assinarToken, conferirSenha, hashSenha, logAcesso, requireAuth, type TokenPayload } from "./lib/auth.ts";

const db = prisma as any;
const ipDe = (req: Request) =>
  (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() || req.socket.remoteAddress || undefined;

/** Carrega perfis (nomes) e permissões (chaves) de um usuário. */
async function carregarAcesso(usuario_id: string) {
  const vinc = await db.usuarioPerfil.findMany({
    where: { usuario_id },
    include: { perfil: { include: { permissoes: { include: { permissao: true } } } } },
  });
  const perfis: string[] = vinc.map((v: any) => v.perfil.nome);
  const perm = new Set<string>();
  for (const v of vinc) for (const pp of v.perfil.permissoes) perm.add(pp.permissao.chave);
  return { perfis, perm: [...perm] };
}

export function registerAuth(app: Express) {
  app.post("/api/auth/login", async (req, res) => {
    const { email, senha } = req.body ?? {};
    const ip = ipDe(req);
    if (!email || !senha) return res.status(400).json({ error: "email e senha são obrigatórios" });
    try {
      const u = await db.usuario.findUnique({ where: { email: String(email).toLowerCase().trim() } });
      // resposta genérica: não revela se o email existe
      if (!u || !u.ativo || !(await conferirSenha(senha, u.senha_hash))) {
        await logAcesso(u?.id ?? null, "login_falha", { ip, sucesso: false });
        return res.status(401).json({ error: "credenciais inválidas" });
      }
      const { perfis, perm } = await carregarAcesso(u.id);
      const payload: TokenPayload = { sub: u.id, cid: u.colaborador_id ?? null, perfis, perm };
      const token = assinarToken(payload);
      await db.usuario.update({ where: { id: u.id }, data: { ultimo_login: new Date() } });
      await logAcesso(u.id, "login", { ip });
      const colaborador = u.colaborador_id
        ? await db.colaborador.findUnique({ where: { id: u.colaborador_id }, select: { id: true, nome: true } })
        : null;
      res.json({
        token,
        usuario: { id: u.id, email: u.email, perfis, perm, senha_temporaria: u.senha_temporaria, colaborador },
      });
    } catch (e) {
      res.status(500).json({ error: String((e as Error).message) });
    }
  });

  app.get("/api/auth/me", requireAuth, async (req, res) => {
    const u = (req as any).user as TokenPayload & { internal?: boolean };
    if (u.internal) return res.json({ internal: true, perfis: ["admin"] });
    const usuario = await db.usuario.findUnique({
      where: { id: u.sub },
      select: { id: true, email: true, senha_temporaria: true, colaborador_id: true, ativo: true },
    });
    if (!usuario || !usuario.ativo) return res.status(401).json({ error: "usuário inativo" });
    const { perfis, perm } = await carregarAcesso(u.sub);
    const colaborador = usuario.colaborador_id
      ? await db.colaborador.findUnique({ where: { id: usuario.colaborador_id }, select: { id: true, nome: true } })
      : null;
    res.json({ ...usuario, perfis, perm, colaborador });
  });

  app.post("/api/auth/trocar-senha", requireAuth, async (req, res) => {
    const u = (req as any).user as TokenPayload;
    const { senha_atual, nova_senha } = req.body ?? {};
    if (!nova_senha || String(nova_senha).length < 8)
      return res.status(400).json({ error: "nova senha deve ter pelo menos 8 caracteres" });
    const usuario = await db.usuario.findUnique({ where: { id: u.sub } });
    if (!usuario || !(await conferirSenha(senha_atual ?? "", usuario.senha_hash)))
      return res.status(400).json({ error: "senha atual incorreta" });
    await db.usuario.update({
      where: { id: u.sub },
      data: { senha_hash: await hashSenha(nova_senha), senha_temporaria: false },
    });
    await logAcesso(u.sub, "troca_senha", { ip: ipDe(req) });
    res.json({ ok: true });
  });
}
