# JustCore/server/lib — integrações e utilitários transversais

Biblioteca de suporte usada pelas rotas em `server/`. Cada arquivo/subpasta é uma integração
isolada, trocável por driver/env var quando aplicável (mesmo padrão do storage e do e-mail).

- `biometria.ts` — `extractTemplate`, fala com o serviço .NET SourceAFIS (porta 4002).
- `ged-taxonomia.ts` — vocabulário controlado do GED (natureza/setor/processo/classificação).
- `storage/` (`index.ts`, `local.ts`, `sharepoint.ts`, `types.ts`) — abstração de storage do
  GED; driver `local` (dev, pasta `storage/`) ou `sharepoint` (Graph), escolhido por
  `STORAGE_DRIVER`.
- `ia/gemini.ts` — chamada REST ao Gemini (visão) para a triagem de documentos por IA.
- `email/` (`console.ts`, `graph.ts`, `index.ts`, `types.ts`) — `enviarEmail()` transversal;
  driver `console` (dev) ou `graph` (prod), reusa a credencial do SharePoint.
- `graph/token.ts` — token app-only do Microsoft Graph, compartilhado entre storage e e-mail.
- `auth.ts` — bcrypt, JWT HS256, `requireAuth`/`requirePerm`, token de serviço
  `x-internal-token` (chamadas app→Core).
- `rate-limit.ts` — rate limit em memória por ator (usado no envio de e-mail).
- `match-colaborador.ts` — casa colaborador a partir de dados extraídos na triagem por IA.
- `prisma.ts` — client Prisma compartilhado. `nome-arquivo.ts` — normalização de nome de
  arquivo para upload.

Ver `docs/resumo-projeto.md` seção 4 (biometria/auth), 12 (storage/Graph), 17 (e-mail).
