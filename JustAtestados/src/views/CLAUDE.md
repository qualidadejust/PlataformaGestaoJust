# src/views/ — telas do JustAtestados

Telas reais (registradas em `App.tsx`/`Sidebar.tsx`, gating por perfil):
- `Login.tsx` — autenticação.
- `NewEntry.tsx` — novo lançamento (atestado/declaração), inclui o fluxo de reenvio
  (edição) e o recebimento da "ponte" de um documento do GED (`gedDraft`). Perfis:
  apontador + rh.
- `MeusEnvios.tsx` — acompanhamento dos próprios envios (apontador + rh).
- `HrQueue.tsx` — fila de análise do RH (aprovar/recusar, motivo de devolução). Só rh.
- `Dashboard.tsx` — dashboard executivo com KPIs de absenteísmo. Só rh.
- `Registry.tsx` — consulta geral (busca global do Header cai aqui). Só rh.
- `History.tsx` — histórico por colaborador. Só rh.
- `Admin.tsx` — administração do módulo. Só rh.

Cada view consome dados só via `dataService` (`../services`) — nunca importe
`apiDataService` diretamente numa tela.

Ver docs/resumo-projeto.md (seção 2, linha JustAtestados) para detalhes completos.
