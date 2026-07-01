# JustCore/src/views — telas que fogem do CRUD genérico

Telas dedicadas para fluxos que não cabem no `EntityAdmin`/`EntityForm` genérico dirigido por
`entities.tsx`. Hoje: `BiometriaView.tsx` (cadastro de digital do colaborador, captura via
WebSDK), `FormulariosView.tsx` (builder do motor de formulários — tipo/grupo/escopo → itens/
seções → publicar/nova versão) e `AcessosView.tsx` (gestão de acesso: abas Usuários/Perfis/
Auditoria, sob permissão `acesso.admin`).

Cada view consome as rotas específicas do seu domínio (`/api/biometria/...`,
`/api/formularios/...`, `/api/acessos/...`) em vez do CRUD genérico.

Ver `docs/resumo-projeto.md` seção 4 (biometria/acessos) e 14 (motor de formulários).
