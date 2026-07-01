# JustHub/src — tela única e catálogo de módulos

Arquivo-chave: **`modules.ts`** — lista `MODULOS` (um por app da plataforma) com `url` (onde o
front roda) e `healthUrl` (endpoint `/api/health` do back). Em dev cai no fallback localhost;
em produção (Render) `url` vem de `VITE_URL_<KEY>` e `healthUrl` é montado a partir de
`VITE_GATEWAY` (recebidos via `fromService` no `render.yaml`) — ver `normHost`/`frontUrl`/`health`.

`App.tsx` renderiza os cards a partir de `MODULOS`: ícone (mapa `ICONS` por nome lucide),
`StatusDot` faz `fetch(healthUrl)` com timeout curto via React Query (`refetchInterval`) para
mostrar "no ar"/"offline"/"app" (sem interface). Módulo sem `url` (ex.: JustGate) renderiza card
sem link, com badge "sem interface".

`auth.tsx` + `LoginGate.tsx` — auth centralizado no JustCore (mesmo padrão dos demais fronts).
`api-base.ts` — interceptor de `fetch` que prefixa `/api`/`/core` em produção (no-op em dev).
`index.css` — Tailwind v4. `main.tsx` — bootstrap React.

Ver docs/resumo-projeto.md (seção 2, linha JustHub, e seção 11) para detalhes completos.
