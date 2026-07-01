# JustCore/server — API Express do dados-mestre (porta 4100)

`index.ts` sobe o Express e gera **CRUD REST genérico** por entidade via `relationize()`
(converte FK escalar `xxx_id` em `{ xxx: { connect: { id } } }`, exigido pelo Prisma 7):
`GET/POST/PUT/DELETE /api/<entidade>` para os cadastros do `schema.prisma`, além de
`/api/health` e `/api/biometria/...`.

Rotas de domínio específico ficam em arquivos próprios, registrados em `index.ts`:
`documentos.ts` (GED — upload/versão/download mediado), `triagem.ts` (triagem de documento por
IA, Gemini), `formularios.ts` (motor de formulários — templates/instâncias), `emails.ts`
(e-mail transversal via Graph `sendMail`), `acessos.ts` (gestão de usuários/perfis/permissões/
auditoria), `auth.ts` (login/JWT/troca de senha) e `gate.ts`. `integrations/` tem a integração
ACL com o Prevision (backbone Local/Serviço/Tarefa).

Lógica reutilizável (biometria, storage, IA, e-mail, Graph, taxonomia do GED, auth,
rate-limit) fica em `server/lib/` — ver `CLAUDE.md` daquela pasta.

Ver `docs/resumo-projeto.md` seção 4 (e 12/14/15/17).
