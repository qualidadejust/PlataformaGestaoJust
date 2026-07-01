# JustCore — dados-mestre da Plataforma JUST

App **dono único dos cadastros** (empresas, obras, colaboradores, cargos, EPIs, biometria,
backbone ACL, motor de formulários, GED, controle de acesso). Todos os outros apps do
monorepo dependem dele para os cadastros — **suba o JustCore primeiro**.

Stack: React 19 + Vite (front, porta **4101**) + Express + Prisma 7/PostgreSQL (back, porta
**4100**). `npm run dev` sobe front + back + o serviço de biometria .NET junto (via
`concurrently`). CRUD genérico por entidade via `relationize()` em `server/index.ts`.

Pastas principais: `prisma/` (schema + migrations + importadores), `server/` (rotas Express
por domínio) e `src/` (front admin de tela única, dirigido por `entities.tsx`). Cada uma tem
seu próprio `CLAUDE.md`.

Ver `docs/resumo-projeto.md` seção 4 (e 12/14/15/17 para GED, motor de formulários, backbone
ACL e e-mail).
