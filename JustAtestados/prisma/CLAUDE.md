# prisma/ — schema do JustAtestados (Postgres via Prisma 7)

`schema.prisma` define dois models: `Atestado` (a transação — atestado médico OU
declaração de comparecimento, com snapshot de colaborador/obra/cargo vindo do Core e o
campo `ged_documento_id` apontando pro anexo sensível arquivado no GED) e
`EventoAtestado` (trilha de auditoria append-only do módulo). Client via
`@prisma/adapter-pg` (mesmo padrão do Core), conexão por `DATABASE_URL`.

Não duplique cadastro (colaborador/obra/cargo) aqui — são referência + snapshot, a
fonte real é o JustCore. Qualquer mudança de schema deve passar pela skill
`banco-dados` e, se alterar schema/rotas de forma relevante, atualizar
`docs/resumo-projeto.md`.

Não é preciso detalhar `prisma/migrations/` — é gerado (`npm run db:migrate` /
`db:deploy`), não editar manualmente.

Ver docs/resumo-projeto.md (seção 2, linha JustAtestados) para detalhes completos.
