# JustTrain/src/lib — helpers do front

`cn.ts` — além do `cn()` (clsx+tailwind-merge), concentra os helpers de API do app: `api()`
(chama o próprio backend, proxy `/api`→4600) e `core()` (chama o JustCore, proxy `/core`→4100,
para cadastros e GED). Também exporta os dicionários `SETORES` e `TIPOS` (rótulos pt-BR usados
nas telas).

`certificadoPdf.ts` — gera o certificado em PDF (`jsPDF` + `html2canvas`, renderizado no
front) a partir de `CertData` (participação + turma); usado tanto para download/impressão
(`CertificadoView`) quanto para a imagem de preview.

`fingerprint.ts` — wrapper do leitor HID U.are.U 4500 (mesmo padrão do JustSecurity): tenta o
agente local DigitalPersona/WebSDK e cai em modo simulado se ausente. `websdk-stub.ts` — stub
vazio do global `WebSdk`, usado via alias no `vite.config.ts` (o script real vem de
`public/websdk.client.ui.js`).

Ver docs/resumo-projeto.md (tabela de apps / seção 2, diagrama) para o contexto de arquitetura.
