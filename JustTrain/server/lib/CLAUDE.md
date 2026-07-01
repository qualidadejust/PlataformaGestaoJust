# JustTrain/server/lib — infra do backend

`prisma.ts` — client Prisma 7 com `@prisma/adapter-pg` (Postgres/Neon), `DATABASE_URL` do
`.env`. Import interop-safe (client do Prisma 7 é CommonJS — usa `prismaPkg as any` +
`.PrismaClient`), mesmo padrão dos demais apps (Core/Eleva/Security/Frota).

`biometria.ts` — verificação biométrica **1:1** (mesmo fluxo do JustSecurity): busca os
templates do colaborador no **JustCore** (`CORE_URL`, rota `/api/biometria/colaboradores/:id/
templates`, header `x-internal-token`) e chama o serviço **.NET SourceAFIS** (`BIOMETRIA_URL`,
`/match`) para comparar contra a imagem capturada na assinatura. `MATCH_THRESHOLD` (default
**40**) via env. Exporta `verificarDigital()` e `biometriaOnline()`, consumidos pelas rotas
`/api/participacoes/:id/assinar` e `/api/biometria/*` de `server/index.ts`.

Ver docs/resumo-projeto.md (tabela de apps / seção 2, diagrama) para o contexto de arquitetura.
