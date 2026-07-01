# prisma — schema e seeds do banco (SQLite, Prisma Migrate)

`schema.prisma` é a fonte de verdade do banco real (`prisma/dev.db`), gerenciado por Prisma Migrate (`prisma/migrations/`, gerado — não editar/detalhar à mão) e consumido via Prisma Client com adapter better-sqlite3 (`server/lib/prisma.ts`). Para mudar schema: editar `schema.prisma` → `npx prisma migrate dev` → `npx prisma generate` (nunca alterar `data/justavaliacoes.db`/`server/db.ts`, que são legados e não usados pelo servidor).

Scripts auxiliares nesta pasta: `seed.ts` (seed padrão — 6 blocos/24 perguntas do modelo de avaliação default, `npm run db:seed`), `seed-movimentacao-template.ts` (template dedicado `applies_to='movimentacao'` de prontidão), `seed-indicadores-pej.ts` (catálogo de KPIs do PEJ), `import-colaboradores.ts` e `backfill-obras.ts` (migrações pontuais de dados históricos).

Qualquer demanda de schema/migration/query aqui deve passar pela skill `banco-dados`.

Ver AGENTS.md e docs/resumo-projeto.md (deste app) para a tabela completa de entidades e suas relações.
