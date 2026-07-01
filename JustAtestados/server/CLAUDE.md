# server/ — backend Express do JustAtestados

`index.ts` é o entrypoint (porta 4700): rotas de `/api/atestados` (CRUD, lançamento com
upload via multer, aprovar/reprovar pelo RH), `/api/resumo-fila` (cartões da fila),
`/api/kpis` (absenteísmo sobre aprovados) e `/api/eventos` (auditoria). Todas as rotas
passam por `requireAuth`/`requirePerm` (enforcement só em produção, `AUTH_ENFORCE=true`).

`core.ts` concentra a integração com o JustCore: leitura de colaboradores/obras/cargos
(`coreColaboradores`/`coreObras`/`coreCargos`) e o upload do anexo para o GED do Core
(`gedUpload`, sempre `sensivel: true` por carregar CID/saúde), além de
`gedMarcarAprovado` — usado na ponte com documentos que chegam via WhatsApp/JustDocs e
viram atestado aqui sem reenviar o arquivo. Chamadas servidor→servidor usam
`x-internal-token`.

Ver docs/resumo-projeto.md (seção 2, linha JustAtestados) para detalhes completos.
