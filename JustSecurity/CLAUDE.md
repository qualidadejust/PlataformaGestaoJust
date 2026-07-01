# JustSecurity — Segurança do Trabalho / entrega de EPI assinada por digital

App front (4000) + back (4001) que registra **entrega de EPI assinada por biometria**
(HID U.are.U 4500), fichas de EPI (ciclo de vida: prazo/inspeção/uso único) e relatórios.
Guarda só as **transações** (entregas, fichas, inspeções); colaboradores e EPIs são
cadastro do **JustCore** — a UI consome `/core/api/...` via proxy do Vite
(`vite.config.ts`), nunca duplica cadastro aqui.

Back roda em `server/` (Express + **Prisma/Postgres**, ver `server/lib/prisma.ts`).
Front em `src/`. Serviço de biometria (.NET SourceAFIS, match 1:N) fica em `biometria/`
(porta 4002), consumido por `server/biometria.ts`.

O termo de entrega tem valor jurídico: cada `entrega` é gravada com hash encadeado
(`hash`/`hash_anterior`), calculado em `server/index.ts` (`calcHash`), não no schema.

Ver docs/resumo-projeto.md seção 6 (e subseção "Como a digital funciona") para detalhes completos.
