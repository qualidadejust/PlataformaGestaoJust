# server — backend Express do JustSecurity (porta 4001)

**Atenção**: apesar do que o `README.md` do app ainda descreve, **não existe mais
`server/db.ts`/better-sqlite3** — o app foi portado para **Prisma + Postgres (Neon)**,
como todos os outros apps do monorepo (ver `lib/prisma.ts` e docs/resumo-projeto.md
seção 11, "Port SQLite → PostgreSQL"). O schema legado (ver `prisma/schema.prisma`)
preserva `id` Int autoincrement e datas `String` do desenho original.

- `index.ts` — bootstrap Express; rotas `/api/entregas` (+`/verificacao`, que confere a
  cadeia de hash), `/api/fichas` (+`/resumo`, `/:id`, `/:id/historico`, `/:id/inspecoes`,
  `/:id/baixa`), `/api/biometria/{health,verify}`. Contém `calcHash()` (hash SHA-256
  encadeado da entrega — valor jurídico do termo) e `backfillHashes()` (roda no boot).
  Colaboradores/EPIs **não** têm rota aqui — vêm do Core via proxy do front.
- `biometria.ts` — verificação 1:N: busca templates do colaborador no Core (`CORE_URL`)
  e chama o serviço .NET (`BIOMETRIA_URL`) em `/match`. `MATCH_THRESHOLD` (default 40).
- `ciclo.ts` — ciclo de vida da ficha de EPI: `abrirFicha`, `statusFicha`,
  `registrarInspecao`, `baixarFicha` (troca baixa a ficha anterior e vincula
  `substitui_ficha_id`).

Ver docs/resumo-projeto.md seção 6.
