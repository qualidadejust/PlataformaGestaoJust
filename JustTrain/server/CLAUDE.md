# JustTrain/server — API Express (porta 4600)

`index.ts` é o único arquivo de rotas (sem `server/routes/` separado, ao contrário do
JustEleva) — Express na porta **4600**, CORS liberado, Prisma como `db` (cast `any`, evita
atrito de tipos gerados). Rotas: `/api/treinamentos` (CRUD do catálogo), `/api/turmas` (+ `:id`
com participações), `/api/turmas/:id/participantes` (adiciona colaborador à turma),
`/api/participacoes/:id/assinar` (assina presença — dispara verificação biométrica 1:1 quando
`assinatura_tipo=digital`), `/:id/emitir` (emite certificado), `/:id/certificado` (dados p/
render), `/api/participacoes/verificacao` (audita a cadeia de hash inteira),
`/api/turmas/:id/eficacia` (avaliação 30 dias), `/api/requisitos` (matriz cargo×treinamento),
`/api/matriz` (painel de conformidade por colaborador), `/api/calendario` (agrega turmas
agendadas + eficácias pendentes + certificados vencendo), `/api/biometria/{health,verify}`,
`/api/treinamento-externo/from-ged` (ponte do JustDocs: registra treinamento externo a partir
de um certificado já no GED e aprova o doc).

**Cadeia de hash**: `calcHash()` encadeia cada `Participacao` assinada pelo `hash` da anterior
(snapshot do colaborador + assinatura, ordem fixa) — prova de não-adulteração da presença.
Comunicação com o Core usa `x-internal-token` (`INTERNAL_TOKEN`) via `coreGet`/`gedAprovar`.

Ver docs/resumo-projeto.md (tabela de apps / seção 2, diagrama) para o contexto de arquitetura.
