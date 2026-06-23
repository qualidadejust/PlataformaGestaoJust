// Gateway de deploy da Plataforma JUST.
//
// Por que existe: o Render free tier dá UMA porta por serviço. Em vez de 6 web services
// (não cabem no free tier), este processo sobe os 6 backends Node como processos-filhos em
// portas INTERNAS fixas e roteia o tráfego externo por path com um proxy reverso no $PORT.
//
// - Tráfego externo:  GET /core/api/...  ->  127.0.0.1:4100/api/...   (o prefixo é removido)
// - Tráfego interno (app->Core): continua direto em http://127.0.0.1:4100 (sem passar aqui).
//
// Cada backend mantém o seu próprio node_modules e Prisma Client (sem colisão). Os apps que
// lêem process.env.PORT (Eleva/Frota/Gate) recebem a porta interna explícita aqui.
import "dotenv/config";
import express from "express";
import { createProxyMiddleware } from "http-proxy-middleware";
import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");

// Porta pública do container (Render injeta $PORT). Lida ANTES de spawnar os filhos.
const GATEWAY_PORT = Number(process.env.PORT ?? 8080);

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
];

// Internamente os apps falam com o Core pela porta fixa (sem passar pelo proxy).
const INTERNAL_CORE_URL = "http://127.0.0.1:4100";

// 1) Sobe cada backend como processo-filho, na sua porta interna fixa.
for (const b of BACKENDS) {
  const cwd = path.join(ROOT, b.dir);
  // Cada app lê DATABASE_URL (mesmo nome) mas precisa de um banco diferente. Na produção
  // (Render) a URL de cada um vem de DATABASE_URL_CORE / _ELEVA / _SECURITY / _TRAIN / _FROTA;
  // localmente, deixamos o app carregar o seu próprio .env (não injetamos DATABASE_URL).
  const childEnv: NodeJS.ProcessEnv = { ...process.env, PORT: String(b.port), CORE_URL: INTERNAL_CORE_URL };
  const perAppDb = process.env[`DATABASE_URL_${b.name.toUpperCase()}`];
  if (perAppDb) childEnv.DATABASE_URL = perAppDb;
  else delete childEnv.DATABASE_URL; // evita vazar uma DATABASE_URL do gateway p/ o app errado

  const child = spawn("npm", ["run", "start"], {
    cwd,
    env: childEnv, // não muta process.env (gateway mantém o $PORT do container)
    stdio: "inherit",
    shell: true,
  });
  child.on("exit", (code) => console.error(`[${b.name}] processo saiu com código ${code}`));
}

// 2) Proxy reverso no $PORT, roteando por path.
const app = express();

app.get(["/", "/health"], (_req, res) => {
  res.json({ ok: true, gateway: true, rotas: BACKENDS.map((b) => `/${b.name}`) });
});

for (const b of BACKENDS) {
  app.use(
    `/${b.name}`,
    createProxyMiddleware({
      target: `http://127.0.0.1:${b.port}`,
      changeOrigin: true,
      pathRewrite: { [`^/${b.name}`]: "" }, // /core/api/health -> /api/health
    })
  );
}

app.listen(GATEWAY_PORT, () =>
  console.log(`Gateway na porta ${GATEWAY_PORT} → ${BACKENDS.map((b) => b.name).join(", ")}`)
);
