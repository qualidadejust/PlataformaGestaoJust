# src/hooks — hooks React Query (camada de dados do front)

Um hook por área de rota, encapsulando `useQuery`/`useMutation` do @tanstack/react-query v5: `useCalibrations.ts`, `useCycles.ts`, `useEmployees.ts`, `useEvaluations.ts`, `useFeedback.ts`, `useIndicadores.ts`, `useMovimentacoes.ts`, `useObras.ts`, `usePdi.ts`, `usePortal.ts`, `useSurveys.ts`, `useTemplates.ts`.

Esta é a única porta de entrada de dados para as views — nenhuma view deve chamar `fetch`/axios direto ou importar Prisma/implementação concreta. Cada hook chama a API em `/api/*` (proxiada pelo Vite para o Express de `server/`), cuida de cache, loading state e invalidação de query após mutations.

Rota nova em `server/routes/` → crie (ou estenda) o hook correspondente aqui antes de consumir na view.

Ver AGENTS.md e docs/resumo-projeto.md (deste app) para a tabela de endpoints que cada hook consome.
