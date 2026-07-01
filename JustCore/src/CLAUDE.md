# JustCore/src — front admin (porta 4101)

Front de administração de cadastros: **tela única** dirigida por metadados, não uma tela por
entidade. `entities.tsx` declara os metadados de cada entidade (campos, tipo, relações) e
`App.tsx` monta a navegação em cima disso; `EntityAdmin`/`EntityForm` (em `components/`)
renderizam listagem e formulário genéricos a partir desses metadados.

Telas que fogem do CRUD genérico (biometria, formulários, acessos) ficam em `views/` como
componentes próprios. `auth.tsx` + `LoginGate.tsx` cuidam de login/sessão (auth centralizado
no Core); `api-base.ts` é o interceptor de `fetch` usado em produção (prefixa `/api`/`/core`
com a URL do gateway).

Padrão: ao adicionar uma entidade de cadastro simples, prefira estender `entities.tsx` em vez
de criar uma view nova; view nova só quando o fluxo não é CRUD puro.

Ver `docs/resumo-projeto.md` seção 4.
