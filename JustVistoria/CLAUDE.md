# JustVistoria — vistoria & entrega de apartamentos (back 4800 / front 4801)

App de checklist e entrega de unidades pós-construção. Mesmo padrão JustFrota/JustAtestados:
Express + Prisma 7/Postgres no back, React 19 + Vite + Tailwind v4 + React Query no front, auth
do Core via `api-base.ts` + `LoginGate.tsx`. **Cadastro (Cliente/Unidade/Obra/Colaborador) vem do
JustCore** — este app guarda só transações (pipeline, formulários, NCs, termos, cronograma).

Desenhado para **reuso pelo futuro JustAssistencia** (pós-entrega): o motor de formulários/NC/
agendamento/termo aqui dentro é genérico, sem FK ao domínio de vistoria — por isso não hesite em
tratar `EtapaUnidade`/`ItemEtapa`/`NaoConformidade`/`Termo` como blocos reaproveitáveis.

Subpastas: `prisma/` (schema), `server/` (rotas Express) e `server/lib/` (cronograma Prevision),
`src/` (front — App/auth/api-base), `src/views/` (telas), `src/components/`, `src/lib/`. Cada uma
tem seu próprio `CLAUDE.md`.

Ver `docs/resumo-projeto.md` seção 13 e a skill `vistoria-entrega` para o domínio completo
(pipeline, NC/pendência, termos, cronograma).
