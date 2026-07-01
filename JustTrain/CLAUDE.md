# JustTrain — app de Treinamentos (front 4601 / back 4600)

App **Express + Prisma 7 (Postgres/Neon) + React 19/Vite/Tailwind v4/React Query**, mesmo
padrão de JustFrota/JustAtestados. Guarda só as **transações** de treinamento (catálogo,
turmas, presença assinada, certificados); colaborador/empresa/cargo vêm do **JustCore**
(snapshot na hora, com valor jurídico do termo).

Fluxo: catálogo de treinamentos → turma **interna** (presença assinada por canvas ou digital
HID 4500, verificação 1:1 via Core, cadeia de hash) ou **externa** (SECONCI/SENAI etc.,
presença `declarado` sem assinatura, ponte a partir de um certificado já no GED via
`?ged=<docId>`) → **certificado único** (PDF gerado no front, jsPDF) arquivado no **GED** do
Core → **avaliação de eficácia** 30 dias depois (PBQP-H) → **matriz cargo×treinamento**
(conformidade em_dia/pendente/vencido) → **Calendário** (turmas agendadas, eficácias
pendentes, certificados vencendo em 12 meses).

Estrutura: `prisma/` (schema), `server/` (Express + `lib/`), `src/` (front: `views/`,
`components/`, `lib/`). `.env.example` documenta `DATABASE_URL`, `CORE_URL`, `BIOMETRIA_URL`,
`MATCH_THRESHOLD`. `npm run dev` sobe front+back via `concurrently`; `npm run lint` = `tsc
--noEmit`.

Ver `docs/resumo-projeto.md` (tabela de apps / seção 2, diagrama) para o contexto de arquitetura.
