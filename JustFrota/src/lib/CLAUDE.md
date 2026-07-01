# src/lib/ — utilitários do front

`api.ts` — camada de dados do app: helper de chamada HTTP para o back (`/api`, porta 4300) e
para o Core (`/core`, via proxy do Vite), usado pelas views do `src/views/`. É o único ponto
por onde as telas devem buscar/gravar dados — nunca importar Prisma ou montar `fetch` direto
na view.

`cn.ts` — helper de classes condicionais (clsx + tailwind-merge), padrão de todos os apps do
monorepo.

Ver `docs/resumo-projeto.md` seção 8.
