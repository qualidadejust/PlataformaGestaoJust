# JustFrota — gestão de frota (viagens, custos, rateio por km)

App **Node/Express + Prisma 7/PostgreSQL** (back **4300**, front **4301**), mesmo padrão do
Core/Eleva/Security. **Sem cadastro próprio** — veículo, motorista (colaborador) e obra vêm do
JustCore (4100) via HTTP (`server/core.ts`); este app guarda **só as transações**: diário de
bordo (viagens), abastecimentos, manutenções e custos fixos, com snapshot do nome do Core.

Pastas: `prisma/` (schema + importador de CSV), `server/` (API REST + regras de rateio/
depreciação/custo por veículo), `src/` (front React/Vite/Tailwind v4/React Query, auth via
`api-base`+`LoginGate` do padrão Core). Decisões de domínio (rateio só por km, escopo só
veículos) na skill `frota-gestao`.

Ver `docs/resumo-projeto.md` seção 8 para detalhes completos.
