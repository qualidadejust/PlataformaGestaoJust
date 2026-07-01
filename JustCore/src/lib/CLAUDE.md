# JustCore/src/lib — helpers do front

Utilitários puros do front, sem estado de rede. `utils.ts` traz o `cn()` (clsx + tailwind-
merge) usado em todo o app para classes condicionais. `fingerprint.ts` e `websdk-stub.ts`
dão suporte à captura de digital: tentam o agente local DigitalPersona (WebSDK real) e caem
em stub/modo simulado quando o agente não está instalado — mesmo padrão usado no
JustSecurity.

O interceptor de `fetch` que prefixa `/api`/`/core` em produção (`api-base.ts`) fica na raiz
de `src/`, não aqui.

Ver `docs/resumo-projeto.md` seção 4 e 11 (deploy/api-base).
