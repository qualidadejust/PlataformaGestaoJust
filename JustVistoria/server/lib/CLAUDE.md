# server/lib — cronograma Prevision e infra do backend

`cronograma.ts` é a camada de **fonte trocável** do cronograma da obra: define a interface
`FonteCronograma` (`listar(): TarefaNorm[]`) com duas implementações — `CsvFonte` (hoje, lê o CSV
exportado do Prevision) e `PrevisionApiFonte` (stub para quando houver API/credenciais). Qualquer
nova origem (MS Project, Sienge…) implementa a mesma interface sem mexer no importador
(`prisma/import-prevision.ts`) nem no resto do app. Também tem os parsers: `pacoteDe` (extrai
prefixo do serviço, ex. "ALV"), `extrairUnidade` (reconhece unidade vendável a partir do texto do
serviço) e `desmojibake` (corrige encoding do CSV).

`auth.ts` tem `requireAuth`/`requirePerm` (valida sessão/permissão via Core, no-op em dev sem
`AUTH_ENFORCE`). `prisma.ts` exporta o client Prisma singleton.

Ver `docs/resumo-projeto.md` seção 13 e `docs/integracao-prevision.md` para o mapeamento completo
service→pacote / floor→local / marco CHE.
