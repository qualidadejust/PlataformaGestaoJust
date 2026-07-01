# server/routes — routers Express por domínio

Um arquivo por domínio, cada um exportando um `Router` do Express registrado em `../index.ts`: `alocacoes.ts`, `calibrations.ts`, `cycles.ts`, `employees.ts`, `evaluations.ts`, `feedback.ts`, `indicadores.ts`, `movimentacoes.ts`, `obras.ts`, `pdi.ts`, `portal.ts`, `surveys.ts`, `templates.ts`.

Todo acesso a dado passa pelo Prisma Client (`../lib/prisma.ts`) — nunca SQL cru. `employees.ts`, `obras.ts` e `alocacoes.ts` são só leitura na prática (o `index.ts` bloqueia escrita fora do `template_id`, porque cadastro é espelho do JustCore). `portal.ts` serve o portal do avaliador sem login (acesso por `access_token`). `indicadores.ts` cobre catálogo, atribuição por pessoa e lançamento do realizado — ainda **fora da nota** (piloto).

Ao criar uma rota nova dentro de um domínio existente, siga o padrão do arquivo (validação de body, status codes, shape de retorno já usado pelos hooks em `src/hooks/`). Domínio novo → arquivo novo + registro em `server/index.ts` + hook correspondente em `src/hooks/`.

Ver AGENTS.md e docs/resumo-projeto.md (deste app) para a tabela completa de rotas e o schema de cada tabela.
