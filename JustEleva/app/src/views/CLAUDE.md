# src/views — telas da aplicação (uma por arquivo)

Cada tela do JustEleva é um componente React em arquivo próprio: `CalibrationView.tsx`, `CentralView.tsx`, `CycleManagementView.tsx`, `DashboardView.tsx`, `EmployeeProfileView.tsx`, `EvaluationFormView.tsx`, `EvaluationsListView.tsx`, `EvaluatorPortal.tsx`, `FeedbackView.tsx`, `IndicadoresView.tsx`, `MovimentacaoView.tsx`, `ObrasView.tsx`, `PDIDetailView.tsx`, `PDIView.tsx`, `ReportsView.tsx`, `SettingsView.tsx`, `SurveyResponseView.tsx`, `SurveyView.tsx`, `TeamView.tsx`.

Views buscam dados só pelos hooks React Query de `src/hooks/` (nunca chamam `fetch`/implementação concreta direto) e usam componentes de `src/components/` para header/sidebar/logo. `EvaluatorPortal.tsx` e `SurveyResponseView.tsx` são exceções de fluxo: rodam **fora do shell autenticado** (portal sem login por link mágico / resposta anônima de pesquisa), detectadas em `App.tsx` por `window.location.pathname`. `EvaluationFormView.tsx` é reusado tanto na avaliação normal quanto na de movimentação (esconde Eixo de Potencial/PDI quando `type==='movimentacao'`).

Nova tela: crie o arquivo aqui, adicione o `case` em `App.tsx` e o item de menu em `src/components/Sidebar.tsx` (gating por perfil quando aplicável).

Ver AGENTS.md e docs/resumo-projeto.md (deste app) para a lista de telas com seu propósito e status (várias ainda tinham dado hardcoded — checar antes de assumir que já consome API).
