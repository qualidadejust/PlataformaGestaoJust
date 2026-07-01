# src/views/ — telas (abas) do JustDocs

Uma view por aba, todas registradas em `../App.tsx`:

- **`PastasView.tsx`** — navegação tipo SharePoint com breadcrumb sobre o GED. A "pasta" é
  uma visão derivada da taxonomia (natureza/setor/entidade/processo), não um caminho real: 4
  raízes **SGQ** (docs padrão por processo→classificação), **Obras** (por obra→setor),
  **Pessoas** (por colaborador) e **Empresa** (setores globais).
- **`DocumentosView.tsx`** — upload/consulta/versionamento de documentos (`/api/documentos`).
- **`FilaView.tsx`** — fila de análise de documentos.
- **`TriagemView.tsx`** — Triagem IA: sobe até 2 arquivos, a IA (Gemini, no Core) propõe
  tipo/colaborador/sensível/validade; usuário confere e envia ao GED.
- **`VencimentosView.tsx`** — documentos por vencer/vencidos (`valido_ate`).
- **`CronogramaView.tsx`** — árvore do backbone Local/Serviço/Tarefa (Prevision) para ancorar
  documentos por tarefa/obra.

Todas consomem `../lib/api.ts` (fetch para o Core via proxy) e `../lib/entidades.ts` (mapa de
entidades do Core). Ver `docs/resumo-projeto.md` seção 12 (taxonomia do GED) e seção 15
(backbone Local/Serviço/Tarefa) e a skill `ged-documentos`.
