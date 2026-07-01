# server — API do JustVistoria (Express, porta 4800)

`index.ts` concentra todas as rotas (sem router por domínio): `/api/health` (pública),
`/api/formulario-modelos`, pipeline (`/api/unidades/:id/{iniciar,etapas,construcao,relatorio,
relatorio/arquivar}`, `/api/etapas/:id`, `/api/itens`), motor de formulários (`/api/instancias` —
recebe respostas, calcula reprovadas e **abre NC automaticamente** por item não-conforme), fotos
(`/api/fotos`, multi-upload → GED do Core via `gedUpload`), NCs (`/api/ncs` com filtros
`severidade=pendencia|critica`/`categoria`/`abertas=1`, POST cria pendência manual, `:id/
reverificar`) e termos (`/api/termos`, multipart PDF+campos — bloqueia `entrega_chaves` se houver
NC crítica em aberto).

Tudo atrás de `requireAuth` + `requirePerm("vistoria.read"|"vistoria.write")` (`lib/auth.ts`), exceto
`/api/health`. `core.ts` centraliza a integração com o Core: `coreUnidades()` (lista unidades/
clientes/obras) e `gedUpload()` (upload de evidências/termos no GED). `lib/prisma.ts` expõe o
client Prisma; `lib/cronograma.ts` tem CLAUDE.md próprio (fonte do cronograma Prevision).

Ver `docs/resumo-projeto.md` seção 13 e skill `vistoria-entrega` para o fluxo completo de cada rota.
