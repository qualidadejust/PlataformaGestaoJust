# src — front do JustSecurity (React 19 + Vite 6 + Tailwind v4)

Front puro, porta 4000, proxy do Vite: `/api` → back do próprio app (4001), `/core` →
JustCore (4100, cadastro de colaboradores/EPIs). Camada de dados em `hooks/useEpi.ts`
(React Query) — telas nunca chamam `fetch` direto nem duplicam cadastro do Core.

Auth: `auth.tsx` (contexto) + `LoginGate.tsx` (login/troca de senha), autenticação
centralizada no JustCore; `api-base.ts` injeta o `Authorization: Bearer` e trata 401.
`App.tsx` é o shell (navegação entre as views). `lib/empresa.ts` e `lib/utils.ts` são
helpers gerais (o segundo inclui o wrapper `api()` de chamada HTTP).

O fluxo de biometria (captura no navegador → agente local → leitor USB) está isolado em
`lib/fingerprint.ts` + `components/FingerprintCapture.tsx` — ver `CLAUDE.md` de `lib/`
e `components/` para detalhes.

Ver docs/resumo-projeto.md seção 6 e subseção "Como a digital funciona".
