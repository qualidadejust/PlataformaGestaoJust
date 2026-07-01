# JustFVS — Fichas de Verificação de Serviço (qualidade PBQP-H)

App **front-only** (porta 4900), sem back/DB próprio: consome integralmente o **Core (4100)** —
motor de formulários, backbone Local/Serviço/Tarefa, GED e auth. Proxy do Vite: `/api` → Core
4100 (motor, backbone, GED, NC, auth); `/core` também disponível sem prefixo. O gate sequencial
(bloqueio de FVS por predecessora sem aprovação) é validado **no Core**, não aqui.

Estrutura: `src/App.tsx` (shell + 4 abas: Gestão/Cronograma/Fichas FVS/Pendências, roteamento
simples por estado local, sem react-router), `src/auth.tsx` + `LoginGate.tsx` (sessão via Core),
`src/views/` (telas), `src/lib/` (api helper, types, cn).

Ver `docs/resumo-projeto.md` seção 16 (e skill `qualidade-fvs`) para o fluxo completo: Cronograma
→ Gestão → NovoFvs → Pendências, e o gate sequencial no Core.
