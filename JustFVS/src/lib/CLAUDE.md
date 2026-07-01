# lib/ — camada de acesso a dados do JustFVS

`api.ts` exporta o helper `api<T>(path, opts)`: faz `fetch("/api" + path, opts)` (proxy Vite →
Core 4100), define `Content-Type: application/json` quando o body não é `FormData` (upload de
foto para o GED), e em resposta não-ok lança `Error` com a mensagem pt-BR vinda de
`{ error }` do backend (ou `statusText` como fallback). Toda tela deve consumir dados **só por
este helper** — nunca `fetch` direto na view.

`types.ts` guarda os tipos compartilhados entre as views. `cn.ts` é o utilitário de classes
condicionais (Tailwind), igual aos demais apps do monorepo.

Ver `docs/resumo-projeto.md` seção 16 (e skill `qualidade-fvs`) para detalhes completos.
