# src/lib — API client e tipos compartilhados do front

`api.ts` é a camada de dados única do app: helpers `api.get/post/put/del/postForm` (o último para
multipart — termos e fotos) sobre `fetch`, mais todos os tipos compartilhados entre views
(`Unidade`, `Etapa`, `ItemEtapa`, `NaoConformidade`, `ModeloForm`, `Termo`, `Construcao`,
`EspelhoLinha`) e constantes de domínio: `DISCIPLINAS` (categorias para distribuir pendências às
equipes), `SEVERIDADE_LABEL`/`NC_STATUS_LABEL`/`ETAPA_LABEL` (rótulos pt-BR para os enums do
back). `cn.ts` é o helper de classes condicionais (Tailwind).

Views **nunca** devem chamar `fetch` diretamente nem duplicar esses tipos — sempre importar
daqui, mantendo a view desacoplada da implementação de transporte.

Ver `docs/resumo-projeto.md` seção 13 e skill `vistoria-entrega`.
