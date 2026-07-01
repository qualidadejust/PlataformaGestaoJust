# prisma — schema do JustSecurity (Postgres via Neon)

`schema.prisma`: provider `postgresql`, cliente `prisma-client-js`. Modelos: `entregas`
(entrega de EPI assinada — snapshot de colaborador/EPI/empresa do Core + campos de
biometria `bio_enrolled`/`bio_match`/`bio_score` + cadeia `hash`/`hash_anterior`),
`fichas` (ciclo de vida do EPI: status, validade, inspeção, baixa, troca) e `inspecoes`.

**Legado intencional, não "consertar" sem migração de dados**: schema obtido por
introspecção do banco real (`prisma db pull`) para preservar dados — `id` é `Int
@id @default(autoincrement())` (referenciado por `ficha_id`/`entrega_id`/
`substitui_ficha_id`) e datas são `String` ISO, não `DateTime`. Flags booleanas de
biometria ficam `Int` (0/1) como já gravadas.

A URL de conexão não fica aqui — vai em `prisma.config.ts` (raiz do app), lida de
`DATABASE_URL` no `.env`, no padrão Prisma 7 com `@prisma/adapter-pg`.

Ver docs/resumo-projeto.md seção 6 e seção 11 (port SQLite→PostgreSQL).
