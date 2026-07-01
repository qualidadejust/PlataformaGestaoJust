# src/ — front do JustDocs (React 19 + Vite + Tailwind v4)

`main.tsx` monta a árvore: importa `api-base.ts` primeiro (interceptor de `fetch` que
prefixa `/api`/`/core` em produção via `VITE_GATEWAY`), depois `AuthProvider`
(`auth.tsx`) → `LoginGate` (`LoginGate.tsx`, login/troca de senha obrigatória) → `App.tsx`.
`App.tsx` é o shell de abas (Pastas/Documentos/Fila de Análise/Triagem IA/Vencimentos/
Cronograma), cada uma um componente em `views/`.

`auth.tsx` fala com o login centralizado do Core (`/core/api/auth`) e expõe `useAuth()`
(`user`, `pode(permissao)`) para gate de tela/ação. Não há camada de dados própria além de
`lib/` — todas as views chamam `lib/api.ts` diretamente (sem hooks intermediários, diferente
de outros apps do monorepo).

Ver `docs/resumo-projeto.md` seção 12 e skill `ged-documentos` para o modelo de dados do GED
que essas telas consomem.
