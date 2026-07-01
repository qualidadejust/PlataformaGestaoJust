# server/lib/ — utilitários do backend

`prisma.ts` instancia o `PrismaClient` com `@prisma/adapter-pg` (Postgres/Neon), mesmo
padrão do JustCore, usando `DATABASE_URL` do `.env`.

`auth.ts` faz a revalidação do JWT emitido pelo Core e aplica as permissões do módulo
(`atestados.read/write/aprovar`) via `requireAuth`/`requirePerm`. O Core é a fronteira
real de autenticação; aqui só refinamos por permissão. Em dev, sem `AUTH_ENFORCE=true`,
fica aberto (mesmo comportamento dos demais apps). `atorNome()` extrai o nome de quem
está logado para snapshot/auditoria.

Ver docs/resumo-projeto.md (seção 2, linha JustAtestados) para detalhes completos.
