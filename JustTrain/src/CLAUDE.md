# JustTrain/src — front-end (React 19 + Vite + Tailwind v4)

`App.tsx` é o roteador do app: navegação simples por estado (`Tab` para as 4 abas — Turmas,
Treinamentos, Matriz, Calendário — e `Tela` para a pilha turmas→detalhe→certificado, mesmo
padrão do JustDocs). Trata também a **ponte do JustDocs**: query string `?ged=<docId>` abre
direto `FinalizarExternoView` para registrar um certificado externo já arquivado no GED.

`main.tsx` bootstrap do React; `index.css` Tailwind; `auth.tsx` + `LoginGate.tsx` (auth
centralizado no Core, compartilhado entre os fronts) protegem o app até login;
`api-base.ts` é o interceptor de `fetch` que injeta `Authorization: Bearer` e, em produção,
prefixa `/api`/`/core` com a URL do gateway (`VITE_GATEWAY`/`VITE_API_PREFIX`) — em dev é
no-op (usa o proxy do Vite). Subpastas: `views/` (telas), `components/` (assinatura/digital),
`lib/` (`api`/`core` helpers, `cn`, PDF do certificado, wrapper da digital).

Ver docs/resumo-projeto.md (tabela de apps / seção 2, diagrama) para o contexto de arquitetura.
