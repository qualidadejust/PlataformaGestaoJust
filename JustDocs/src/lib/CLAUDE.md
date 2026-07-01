# src/lib/ — utilitários compartilhados do JustDocs

`api.ts` é a única camada de dados do app: `api(path, opts)` faz `fetch("/api" + path, ...)`
(o proxy do Vite aponta `/api` → JustCore 4100) e lança erro com a mensagem pt-BR do back;
`uploadDoc(form)` é o atalho para `POST /api/documentos` (multipart). Toda view deve passar
por aqui — nunca chamar `fetch` direto na tela.

`entidades.ts` define `ENTIDADES` (colaborador/obra/empresa/veículo/fornecedor) — o mapa das
entidades do Core que podem receber documentos, usado nos seletores de "anexar a" das telas
de upload/triagem. `cn.ts` é o helper padrão `clsx + tailwind-merge` usado em toda a UI.

Ver `docs/resumo-projeto.md` seção 12 para o modelo de dados (`Documento`/`TipoDocumento`) por
trás dessas chamadas e a skill `ged-documentos`.
