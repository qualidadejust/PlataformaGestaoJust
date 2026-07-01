# server/lib — utilitários do backend

Só `prisma.ts`: instancia o `PrismaClient` do JustSecurity usando o adapter
`@prisma/adapter-pg` (driver `pg`) contra `DATABASE_URL` (Postgres/Neon) — padrão
Prisma 7 do monorepo (URL não vai no `schema.prisma`, só aqui/`prisma.config.ts`).
Import é interop-safe porque o client gerado pelo Prisma 7 é CommonJS (usa o default
export do pacote `@prisma/client`).

Todo acesso a dado transacional do app (`entregas`, `fichas`, `inspecoes`) passa pelo
`prisma` exportado daqui — nunca SQL cru.

Ver docs/resumo-projeto.md seção 6.
