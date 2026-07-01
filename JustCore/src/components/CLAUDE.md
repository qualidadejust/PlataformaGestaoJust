# JustCore/src/components — motor da tela única de cadastros

Componentes genéricos que renderizam qualquer entidade a partir dos metadados de
`entities.tsx`: `EntityAdmin.tsx` (listagem/tabela + ações), `EntityForm.tsx` (formulário
gerado dos campos declarados) e `RefSelect.tsx` (select de relação, populado consultando a
própria API do Core — ex. escolher `Obra`/`Colaborador` num campo de FK).

`FingerprintCapture.tsx` é o componente de captura de digital (usado pela `BiometriaView`),
mesmo padrão do JustSecurity: tenta o agente local DigitalPersona, cai em modo simulado se
não houver.

Ao adicionar uma entidade nova ao admin, normalmente não se cria componente novo aqui — só se
estende `entities.tsx`. Componente novo só para fluxo que o CRUD genérico não cobre.

Ver `docs/resumo-projeto.md` seção 4.
