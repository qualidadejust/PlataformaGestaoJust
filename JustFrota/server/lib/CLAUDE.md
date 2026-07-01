# server/lib/ — infraestrutura do backend

Só `prisma.ts` hoje: instancia o Prisma Client (adapter `@prisma/adapter-pg`, `DATABASE_URL`
do `.env` via `prisma.config.ts`, padrão de todos os apps com dados da plataforma) e é
importado por `server/index.ts` para todo acesso a Viagem/Abastecimento/Manutencao/CustoFixo.

Não coloque aqui lógica de domínio (rateio, depreciação, custo por veículo) — isso vive em
`server/index.ts`; nem chamadas ao Core — isso vive em `server/core.ts`.

Ver `docs/resumo-projeto.md` seção 8.
