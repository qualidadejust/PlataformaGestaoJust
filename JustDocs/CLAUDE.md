# JustDocs — UI do GED (gestão eletrônica de documentos)

App **front-only** (porta **4400**, sem back/DB próprio) que consome a API do **JustCore**
(proxy Vite `/api` → 4100) para as rotas `/api/documentos`, `/api/ged/taxonomia`,
`/api/tipos-documento` e os cadastros do Core (colaborador/obra/empresa/veículo/fornecedor).
Os arquivos em si moram no **SharePoint** (Graph); o JustDocs nunca fala com o Graph
diretamente — tudo passa pelo Core.

Seis abas em `src/App.tsx`: **Pastas** (`PastasView` — navegação tipo SharePoint com
breadcrumb), **Documentos** (upload/versão/download), **Fila de Análise** (`FilaView`),
**Triagem IA** (`TriagemView`), **Vencimentos** (`VencimentosView`) e **Cronograma**
(`CronogramaView`, backbone Local/Serviço/Tarefa). Auth via `src/auth.tsx` +
`src/LoginGate.tsx` (JWT do Core); `src/api-base.ts` faz o interceptor de `fetch` (prefixa
`/api`/`/core` em produção via `VITE_GATEWAY`).

Ver `docs/resumo-projeto.md` seção 12 (Armazenamento de arquivos/SharePoint/Graph) e seção 2
(mapa de portas) e a skill `ged-documentos` para detalhes completos.
