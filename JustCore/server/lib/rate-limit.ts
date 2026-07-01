import type { RequestHandler, Request } from "express";
import type { TokenPayload } from "./auth.ts";

// Rate limit em memória (janela fixa), sem dependência externa. Suficiente para um único
// processo (o Core roda como 1 processo no gateway). Se um dia houver múltiplas instâncias,
// trocar por um store compartilhado (Redis) — a interface do middleware não muda.

interface Bucket {
  count: number;
  resetAt: number;
}

// Chave por ator: usuario_id (JWT) → x-internal-token (chamada app→Core) → IP → "anon".
function chaveAtor(req: Request): string {
  const sub = ((req as any).user as TokenPayload | undefined)?.sub;
  if (sub) return `u:${sub}`;
  if (req.headers["x-internal-token"]) return "internal";
  const ip =
    (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() || req.socket.remoteAddress;
  return `ip:${ip ?? "anon"}`;
}

/**
 * Middleware de rate limit por ator. `max` requisições por janela de `windowMs`.
 * Excedeu → 429 com mensagem pt-BR e header `Retry-After` (segundos).
 * Chamadas internas (x-internal-token) são isentas por padrão — são apps confiáveis do
 * monorepo, e um digest legítimo pode disparar muitos e-mails de uma vez.
 */
export function rateLimit(opts: {
  max: number;
  windowMs: number;
  isentaInternal?: boolean;
}): RequestHandler {
  const { max, windowMs, isentaInternal = true } = opts;
  const buckets = new Map<string, Bucket>();

  return (req, res, next) => {
    const chave = chaveAtor(req);
    if (isentaInternal && chave === "internal") return next();

    const agora = Date.now();
    const b = buckets.get(chave);
    if (!b || agora >= b.resetAt) {
      buckets.set(chave, { count: 1, resetAt: agora + windowMs });
      return next();
    }
    if (b.count >= max) {
      const retryS = Math.ceil((b.resetAt - agora) / 1000);
      res.setHeader("Retry-After", String(retryS));
      return res.status(429).json({ error: `Muitas requisições. Tente novamente em ${retryS}s.` });
    }
    b.count++;
    next();
  };
}
