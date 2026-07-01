# JustAtestados — módulo de atestados e declarações de comparecimento

App isolado (front porta 4701, back Express porta 4700) do fluxo: lançamento (perfil
`apontador`) → fila de análise (RH aprova/recusa) → KPIs de absenteísmo. Guarda só a
transação (`Atestado`) com snapshot do colaborador/obra/cargo — o cadastro em si é
só-leitura do JustCore (4100). O anexo (atestado/CID, dado de saúde) nunca fica aqui: é
arquivado como documento **sensível** no GED do Core, e este app guarda só o
`ged_documento_id`.

Front adaptado do repo externo `pridema1/atestadosJUST`: telas e visual mantidos, mas a
camada de dados foi trocada por `src/services/apiDataService.ts` (consome o back local +
o Core via proxy `/core/...`). Permissões: `atestados.read` / `atestados.write` /
`atestados.aprovar`.

Estrutura: `prisma/` (schema), `server/` (rotas Express), `src/` (front React 19 + Vite +
Tailwind v4). Rode com `npm run dev` (sobe front+back via concurrently); `npm run
db:migrate`/`db:deploy` para o schema.

Ver docs/resumo-projeto.md (seção 2, linha JustAtestados) para detalhes completos.
