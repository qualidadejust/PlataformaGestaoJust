# src/ — shell do app e integração com o Core

`App.tsx` monta o layout (header + 4 abas: Gestão/Cronograma/Fichas FVS/Pendências) e controla a
navegação por estado local (`NavState`, sem react-router) — inclui o desvio para `NovoFvsView`
quando uma `tarefaId` é selecionada, preservando a aba de origem para retorno. `auth.tsx` +
`LoginGate.tsx` cuidam da sessão (login/JWT via Core). `api-base.ts` guarda a base de URL da API.

Views ficam em `views/`, e o acesso a dados (fetch ao Core) fica isolado em `lib/` — não chame
`fetch` diretamente nas views, use o helper `api()`.

Ver `docs/resumo-projeto.md` seção 16 (e skill `qualidade-fvs`) para detalhes completos.
