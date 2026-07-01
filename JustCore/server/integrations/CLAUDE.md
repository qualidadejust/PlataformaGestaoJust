# JustCore/server/integrations — ACL Prevision (backbone Local/Serviço/Tarefa)

Módulo de integração com o cronograma **Prevision**, que semeia e sincroniza o backbone ACL
(`Local`, `Servico`, `Tarefa` no `schema.prisma`) — a célula atômica `Obra × Serviço × Local`
usada por JustDocs/FVS/NC/Estoque.

- `previsionClient.ts` — parser do CSV exportado do Prevision.
- `mappers/prevision.ts` — converte `PrevisionRow` em `{ locais, servicos, tarefas }`
  (`extractSigla()` deriva o serviço a partir do prefixo do CSV).
- `sync/syncPrevision.ts` — upsert idempotente (RI-01): grava `Local` → `Servico` → `Tarefa`
  em sequência; pode rodar N vezes com o mesmo CSV sem duplicar.
- `routes.ts` — rotas Express (`registerIntegrations()`), registradas em `server/index.ts`:
  `POST /api/integrations/prevision/sync`, `GET /api/integrations/prevision/status/:obra_id`,
  `GET /api/integrations/status` (stub para o Sienge).

Regra de ouro: cada campo tem um único dono (Prevision = LBS/cronograma, Sienge = fiscal/
orçamento) — nunca sincronização de mão dupla.

Ver `docs/resumo-projeto.md` seção 15.
