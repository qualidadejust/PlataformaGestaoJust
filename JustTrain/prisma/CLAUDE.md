# JustTrain/prisma — schema do banco de treinamentos

`schema.prisma` (provider `postgresql`, Neon) define 3 modelos: **`Treinamento`** (catálogo —
nome, `codigo` slug único, `tipo` nr/integracao/qualidade/sistema/procedimento/it, `setor`
para a taxonomia do GED, `carga_horaria`, `validade_meses` para reciclagem);
**`RequisitoTreinamento`** (matriz cargo×treinamento do Manual de Cargos e Funções — liga
`cargo` texto ao `treinamento_codigo`, com `condicional` para "se aplicável"); **`Turma`**
(uma realização — snapshot do treinamento, `origem` interna/externa, campos de **avaliação de
eficácia** 30 dias `eficacia_*`); **`Participacao`** (presença + assinatura de um colaborador
numa turma — `assinatura_img`/`assinatura_tipo`, resultado biométrico `bio_*`, `hash`/
`hash_anterior` da cadeia de prova, `ged_documento_id` do certificado).

IDs em UUID, tabelas em `snake_case` via `@@map`. **Não** detalhar `migrations/` (histórico
gerado, não editar à mão). `seed-treinamentos.ts` (irmão de `schema.prisma`, fora do
`migrations/`) semeia o catálogo real da JUST (Manual de Cargos, ITs de Treinamento e
Capacitação, Integração, PQO) — reexecutável (upsert por `codigo`).

Ver docs/resumo-projeto.md (tabela de apps / seção 2, diagrama) para o contexto de arquitetura.
