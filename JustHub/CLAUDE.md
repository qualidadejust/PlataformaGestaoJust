# JustHub — portal de entrada da plataforma

App **front-only** (porta 4500, sem back/DB próprio) que serve de ponto de entrada: tela
única com um card por módulo (`src/modules.ts`), link para abrir o app e indicador de status
(no ar/offline) via `/api/health` de cada backend. Não guarda dado nenhum — só referencia URLs.

Stack padrão dos fronts do monorepo: React 19 + Vite 6 + TypeScript, Tailwind v4,
`@tanstack/react-query`, `lucide-react`, `cn()` (clsx + tailwind-merge). Auth via JustCore
(`src/auth.tsx` + `src/LoginGate.tsx`), igual aos demais apps.

Ao adicionar um módulo novo à plataforma, é aqui (`src/modules.ts`) que ele ganha card no
portal — inclua `key`, `url`/`healthUrl` (com fallback localhost) e a `tag`.

Ver docs/resumo-projeto.md (seção 2, linha JustHub, e seção 11) para detalhes completos.
