# JustCore/src/hooks — camada de dados do front

Hooks React Query que encapsulam o acesso à API do Core. `useEntity.ts` é o hook genérico
usado pelo `EntityAdmin`/`EntityForm`/`RefSelect` para listar/criar/editar/excluir qualquer
entidade a partir dos metadados de `entities.tsx` (evita repetir fetch/cache por tela).
`useBiometria.ts` cobre o fluxo específico de captura/consulta de template de digital.

Telas devem sempre passar por um hook daqui (ou pelo genérico) para acessar dados — nunca
chamar `fetch`/`api-base` direto de dentro de uma view.

Ver `docs/resumo-projeto.md` seção 4.
