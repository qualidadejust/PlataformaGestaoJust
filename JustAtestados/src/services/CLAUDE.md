# src/services/ — camada de dados do JustAtestados

`dataService.ts` é a interface abstrata (`DataService`) que todas as telas importam via
`index.ts` — nunca a implementação concreta diretamente. `apiDataService.ts`
(`ApiDataService`) é a implementação real e **o ponto que substituiu a fonte de dados do
repo externo original** (`pridema1/atestadosJUST`, que era outro backend): aqui,
documentos/auditoria/KPIs vêm do back do JustAtestados (`/api/...`), cadastro
(colaborador/obra/cargo) vem do JustCore (`/core/api/...`, só-leitura) e a autenticação
também é do Core — o token é guardado via `api-base.ts` (`TOKEN_KEY`).

`cidCatalog.ts` carrega e pesquisa o catálogo CID-10 a partir do asset estático
`public/cid10.json` (dado de referência fixo, não vem de backend). `index.ts` é o ponto
único de export: `export const dataService: DataService = new ApiDataService();`.

Ver docs/resumo-projeto.md (seção 2, linha JustAtestados) para detalhes completos.
