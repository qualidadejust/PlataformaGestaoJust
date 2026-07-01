# server — backend Express do JustEleva (porta 3001)

API REST em Express 4, rodando com `tsx watch` em dev. `index.ts` monta o `app`, aplica `cors()`/`express.json()`, registra cada router de `routes/` sob seu prefixo `/api/*` e expõe `/api/health` e `/api/stats` (agregados via Prisma direto, sem router próprio). `lib/prisma.ts` centraliza a instância do Prisma Client (adapter better-sqlite3, `prisma/dev.db`).

Ponto importante: `index.ts` aplica o middleware `bloqueiaCadastro` em `/api/employees`, `/api/obras` e `/api/alocacoes` — bloqueia qualquer escrita (exceto `PUT /api/employees/:id/template`, que é campo de desempenho, não cadastro) porque esses dados são **espelho do JustCore** (fonte única). Escrita real acontece no Core; aqui só entra via `npm run sync:core`.

Para nova rota: crie o arquivo em `routes/`, exporte um `Router`, importe e registre em `index.ts` com `app.use('/api/<prefixo>', meuRouter)`.

Ver AGENTS.md e docs/resumo-projeto.md (deste app) para a lista completa de endpoints e o schema por trás de cada um.
