# src/ — front da frota (Vite/React 19/Tailwind v4, :4301)

Front-end do módulo, seguindo o padrão dos demais apps com auth centralizado no Core:
`auth.tsx` (AuthProvider/useAuth) + `LoginGate.tsx` (login + troca de senha obrigatória) +
`api-base.ts` (interceptor de `fetch` que injeta `Authorization: Bearer`, trata 401 e, em
produção, prefixa `/api`/`/core` com a URL do gateway). `App.tsx` monta as abas do módulo;
`main.tsx` é o entrypoint.

Telas em `views/` (Diário, Custos, Custo/veículo, Rateio) e utilitários em `lib/`. Todo acesso
a dados passa por `lib/api.ts` (nunca importar Prisma/implementação concreta na view).

Ver `docs/resumo-projeto.md` seção 8.
