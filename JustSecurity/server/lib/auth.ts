// Autorização do JustSecurity. O Core é a fronteira real e o gateway já valida o JWT;
// aqui revalidamos o token para aplicar as PERMISSÕES do módulo (sst.read/write).
// Só enforça quando AUTH_ENFORCE=true (produção). Em dev fica aberto, como os demais apps.
import "dotenv/config";
import type { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET ?? "dev-inseguro-trocar-em-producao";
const ENFORCE = process.env.AUTH_ENFORCE === "true";

export interface TokenPayload {
  sub: string;
  cid: string | null;
  perfis: string[];
  perm: string[];
}

/** Exige token JWT válido (popula req.user). No-op em dev (sem AUTH_ENFORCE). */
export function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (!ENFORCE) return next();
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

/** Exige uma permissão (admin sempre passa). Use após requireAuth. No-op em dev. */
export function requirePerm(chave: string) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!ENFORCE) return next();
    const u = (req as any).user as TokenPayload | undefined;
    if (u?.perfis?.includes("admin") || u?.perm?.includes(chave)) return next();
    return res.status(403).json({ error: "sem permissão", chave });
  };
}
