// Controle de acesso (auth) do Core. Ver skill `controle-acesso`.
// - Senha em bcrypt. Token JWT HS256 com perfis + permissões (RBAC).
// - requireAuth / requirePerm: guardas de rota. Token de serviço (x-internal-token) para
//   chamadas servidor↔servidor (app -> Core) sem usuário logado.
// - logAcesso: trilha de auditoria (append-only) — LGPD.
import "dotenv/config";
import type { Request, Response, NextFunction } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { prisma } from "./prisma.ts";

const db = prisma as any;

const JWT_SECRET = process.env.JWT_SECRET ?? "dev-inseguro-trocar-em-producao";
const INTERNAL_TOKEN = process.env.INTERNAL_TOKEN; // chamadas servidor↔servidor (opcional)
const TOKEN_TTL = process.env.JWT_TTL ?? "12h";

if (process.env.NODE_ENV === "production" && JWT_SECRET === "dev-inseguro-trocar-em-producao") {
  console.warn("[auth] AVISO: JWT_SECRET não definido em produção — defina no .env/Render!");
}

export interface TokenPayload {
  sub: string; // usuario_id
  cid: string | null; // colaborador_id
  perfis: string[]; // nomes dos perfis
  perm: string[]; // chaves de permissão
}

export const hashSenha = (senha: string) => bcrypt.hash(senha, 12);
export const conferirSenha = (senha: string, hash: string) => bcrypt.compare(senha, hash);

export function assinarToken(p: TokenPayload): string {
  return jwt.sign(p, JWT_SECRET, { expiresIn: TOKEN_TTL } as any);
}

/** Trilha de auditoria. Nunca grava senha/token. */
export async function logAcesso(
  usuario_id: string | null,
  acao: string,
  extra: { recurso?: string; entidade_id?: string; ip?: string; sucesso?: boolean } = {}
) {
  try {
    await db.logAcesso.create({
      data: {
        usuario_id,
        acao,
        recurso: extra.recurso ?? null,
        entidade_id: extra.entidade_id ?? null,
        ip: extra.ip ?? null,
        sucesso: extra.sucesso ?? true,
      },
    });
  } catch {
    /* auditoria não pode derrubar a request */
  }
}

/** Exige usuário autenticado (JWT) OU token de serviço interno. Popula req.user. */
export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const internal = req.headers["x-internal-token"];
  if (INTERNAL_TOKEN && internal === INTERNAL_TOKEN) {
    (req as any).user = { sub: "internal", cid: null, perfis: ["admin"], perm: [], internal: true };
    return next();
  }
  const h = (req.headers.authorization as string) ?? "";
  const [scheme, token] = h.split(" ");
  if (scheme !== "Bearer" || !token) return res.status(401).json({ error: "não autenticado" });
  try {
    (req as any).user = jwt.verify(token, JWT_SECRET) as TokenPayload;
    return next();
  } catch {
    return res.status(401).json({ error: "token inválido ou expirado" });
  }
}

/** Exige uma permissão específica (admin e token interno passam). Use após requireAuth. */
export function requirePerm(chave: string) {
  return (req: Request, res: Response, next: NextFunction) => {
    const u = (req as any).user as (TokenPayload & { internal?: boolean }) | undefined;
    if (!u) return res.status(401).json({ error: "não autenticado" });
    if (u.internal || u.perfis?.includes("admin") || u.perm?.includes(chave)) return next();
    return res.status(403).json({ error: "sem permissão", chave });
  };
}
