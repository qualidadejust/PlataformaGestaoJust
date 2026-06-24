// Gateway de deploy da Plataforma JUST.
//
// Por que existe: o Render free tier dá UMA porta por serviço (e só 512 MB). Em vez de 6 web
// services (não cabem no free tier), este processo roteia o tráfego externo por path com um
// proxy reverso no $PORT e sobe cada backend Node como processo-filho — em LAZY START: o app
// só é iniciado na 1ª requisição ao seu path. Em ocioso, fica só o gateway (~50 MB); sob uso
// típico, só os apps realmente acessados consomem RAM (cabe nos 512 MB).
//
// - Tráfego externo:  GET /core/api/...  ->  127.0.0.1:4100/api/...   (o prefixo é removido)
// - Tráfego interno (app->Core): continua direto em http://127.0.0.1:4100 (sem passar aqui).
//
// Cada backend mantém o seu próprio node_modules e Prisma Client (sem colisão). Os apps que
// lêem process.env.PORT (Eleva/Frota/Gate) recebem a porta interna explícita aqui.
import "dotenv/config";
import express from "express";
import jwt from "jsonwebtoken";
import { createProxyMiddleware } from "http-proxy-middleware";
import { spawn } from "node:child_process";
import net from "node:net";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");

// Porta pública do container (Render injeta $PORT). Lida ANTES de spawnar os filhos.
const GATEWAY_PORT = Number(process.env.PORT ?? 8080);
// Quanto esperar um backend ficar pronto na 1ª requisição (cold start do app).
const READY_TIMEOUT_MS = 60_000;

interface Backend {
  name: string; // prefixo de rota (/core, /eleva, ...)
  dir: string; // pasta do app (relativa à raiz do monorepo)
  port: number; // porta interna fixa
}

const BACKENDS: Backend[] = [
  { name: "core", dir: "JustCore", port: 4100 },
  { name: "eleva", dir: "JustEleva/app", port: 3001 },
  { name: "security", dir: "JustSecurity", port: 4001 },
  { name: "train", dir: "JustTrain", port: 4600 },
  { name: "frota", dir: "JustFrota", port: 4300 },
  { name: "gate", dir: "JustGate", port: 4200 },
  { name: "atestados", dir: "JustAtestados", port: 4700 },
];

// Internamente os apps falam com o Core pela porta fixa (sem passar pelo proxy).
const INTERNAL_CORE_URL = "http://127.0.0.1:4100";

// Promise de prontidão por backend (existe = já foi iniciado).
const ready = new Map<string, Promise<void>>();

/** Resolve quando a porta aceitar conexão TCP (ou rejeita no timeout). */
function waitForPort(port: number, timeoutMs: number): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  return new Promise((resolve, reject) => {
    const tryOnce = () => {
      const sock = net.connect({ host: "127.0.0.1", port }, () => {
        sock.destroy();
        resolve();
      });
      sock.on("error", () => {
        sock.destroy();
        if (Date.now() > deadline) reject(new Error(`timeout esperando porta ${port}`));
        else setTimeout(tryOnce, 400);
      });
    };
    tryOnce();
  });
}

/** Sobe o backend (se ainda não subiu) e espera ficar pronto. Idempotente. */
function ensureStarted(b: Backend): Promise<void> {
  let p = ready.get(b.name);
  if (p) return p;

  const cwd = path.join(ROOT, b.dir);
  // Cada app lê DATABASE_URL (mesmo nome) mas precisa de um banco diferente. Na produção
  // (Render) a URL de cada um vem de DATABASE_URL_CORE / _ELEVA / _SECURITY / _TRAIN / _FROTA;
  // localmente, deixamos o app carregar o seu próprio .env (não injetamos DATABASE_URL).
  const childEnv: NodeJS.ProcessEnv = { ...process.env, PORT: String(b.port), CORE_URL: INTERNAL_CORE_URL };
  const perAppDb = process.env[`DATABASE_URL_${b.name.toUpperCase()}`];
  if (perAppDb) childEnv.DATABASE_URL = perAppDb;
  else delete childEnv.DATABASE_URL; // evita vazar uma DATABASE_URL do gateway p/ o app errado

  console.log(`[${b.name}] iniciando (lazy)…`);
  const child = spawn("npm", ["run", "start"], {
    cwd,
    env: childEnv, // não muta process.env (gateway mantém o $PORT do container)
    stdio: "inherit",
    shell: true,
  });
  // Se o processo morrer, esquece a prontidão p/ poder reiniciar na próxima requisição.
  child.on("exit", (code) => {
    console.error(`[${b.name}] processo saiu com código ${code}`);
    ready.delete(b.name);
  });

  p = waitForPort(b.port, READY_TIMEOUT_MS);
  ready.set(b.name, p);
  // Se não ficar pronto, limpa p/ tentar de novo depois.
  p.catch(() => ready.delete(b.name));
  return p;
}

// Proxy reverso no $PORT, com lazy start por path.
const app = express();

app.get(["/", "/health"], (_req, res) => {
  res.json({
    ok: true,
    gateway: true,
    rotas: BACKENDS.map((b) => `/${b.name}`),
    iniciados: [...ready.keys()],
  });
});

// VALIDAÇÃO DE JWT (defesa em profundidade). Ativa se JWT_SECRET estiver setado. O / e /health
// são rotas registradas acima (não chegam aqui). Libera o preflight CORS (OPTIONS) e o login
// público. Cada backend revalida o token (Core é a fronteira real). Mesmo JWT_SECRET do Core.
const JWT_SECRET = process.env.JWT_SECRET;
if (JWT_SECRET) {
  app.use((req, res, next) => {
    if (req.method === "OPTIONS") return next();
    if (req.path.endsWith("/api/auth/login")) return next();
    // Webhook do WhatsApp (Meta Cloud API): a Meta chama SEM Authorization. É público por
    // natureza — protegido pelo WA_VERIFY_TOKEN (GET) e pela assinatura do payload (POST).
    if (req.path === "/gate/webhook") return next();
    const h = (req.headers.authorization as string) ?? "";
    const [scheme, token] = h.split(" ");
    if (scheme === "Bearer" && token) {
      try {
        jwt.verify(token, JWT_SECRET);
        return next();
      } catch {
        /* cai no 401 */
      }
    }
    return res.status(401).json({ error: "não autenticado" });
  });
  console.log("Gateway: validação de JWT ATIVA.");
}

for (const b of BACKENDS) {
  const proxy = createProxyMiddleware({
    target: `http://127.0.0.1:${b.port}`,
    changeOrigin: true,
    pathRewrite: { [`^/${b.name}`]: "" }, // /core/api/health -> /api/health
  });
  app.use(`/${b.name}`, (req, res, next) => {
    ensureStarted(b)
      .then(() => proxy(req, res, next))
      .catch((e) => {
        console.error(`[${b.name}] falhou ao iniciar:`, e?.message);
        res.status(503).json({ error: `backend ${b.name} não subiu a tempo` });
      });
  });
}

app.listen(GATEWAY_PORT, () =>
  console.log(`Gateway na porta ${GATEWAY_PORT} (lazy) → ${BACKENDS.map((b) => b.name).join(", ")}`)
);
