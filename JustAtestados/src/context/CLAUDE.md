# src/context/ — contexto de autenticação do JustAtestados

`AuthContext.tsx` expõe `useAuth()`/`AuthProvider` com `user`, `login`, `logout`,
`initializing` (evita piscar a tela de login enquanto a sessão persistida é verificada).
Delega toda a lógica ao `dataService` (`observeSession`, `login`, `logout`) — não fala
direto com o backend. O `role` do usuário (`apontador` | `rh`, vindo dos perfis do Core)
é o que governa o gating de telas em `App.tsx`/`Sidebar.tsx`.

Ver docs/resumo-projeto.md (seção 2, linha JustAtestados) para detalhes completos.
