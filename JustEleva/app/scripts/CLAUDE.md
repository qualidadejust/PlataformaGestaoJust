# scripts — utilitários operacionais do JustEleva

`sync-from-core.ts` (rodado via `npm run sync:core`) sincroniza os dados-mestre do JustCore (fonte única de cadastro) para o espelho local do JustEleva: lê `employees`/`obras`/`alocacoes` direto do SQLite do Core (`../../../JustCore/prisma/dev.db`) e faz UPSERT por id no SQLite do JustEleva (`prisma/dev.db`), preservando campos exclusivos do Eleva (`cost_center`, `template_id`). Alocações são substituídas por completo (delete + insert) a cada rodada, pois os ids não correspondem entre os dois bancos. Não apaga colaboradores/obras — é idempotente e reexecutável.

`show-db.mjs` é utilitário de inspeção rápida do banco em dev (debug local, não faz parte do fluxo de sync).

Ver AGENTS.md e docs/resumo-projeto.md (deste app) para o fluxo Core→Eleva e quais campos são "só do Core" vs. "só do Eleva".
