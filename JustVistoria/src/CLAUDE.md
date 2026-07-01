# src — front do JustVistoria (React 19 + Vite + Tailwind v4)

`App.tsx` é o shell: sidebar com busca de unidade (lista vem do Core, `/core/api/unidades`) e
navegação entre `EspelhoView` (visão geral), `PendenciasView` (lista de pendências) e
`PipelineView` (quando uma unidade é selecionada). `auth.tsx` + `LoginGate.tsx` fazem a
autenticação (delegada ao Core); `api-base.ts` é o interceptor de fetch (injeta Authorization e,
em produção, o prefixo do gateway). `main.tsx` monta a app com React Query.

Chamadas usam dois prefixos: `/api/...` (backend próprio, 4800) e `/core/api/...` (JustCore 4100:
cadastros e GED) — ambos via proxy do Vite em dev. Views ficam em `src/views/`, componentes
reutilizáveis em `src/components/`, tipos/API client em `src/lib/`.

Ver `docs/resumo-projeto.md` seção 13 e skill `vistoria-entrega`. UI 100% pt-BR, `cn()` para
classes condicionais, sempre com par `dark:`.
