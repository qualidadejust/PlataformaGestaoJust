# src/ — frontend do JustAtestados (React 19 + Vite + Tailwind v4)

`App.tsx` monta o shell (Sidebar + Header + roteamento de views por estado local) e
resolve o gating de tela por perfil (`apontador` × `rh`, ver `VIEWS_BY_ROLE`). Também
trata a "ponte" do GED: ao abrir com `?ged=<docId>` (vindo do JustDocs/WhatsApp), busca o
documento no Core e pré-preenche um novo lançamento via `gedDraft`.

`types.ts` define os tipos de domínio (User, Documento/Atestado, Cid, KPI etc.) e o
`ViewState`/`Role` usados pelo gating. `utils.ts` traz o `cn()` para classes condicionais.
`api-base.ts` centraliza a base da API e a chave do token (`TOKEN_KEY`).

Subpastas: `views/` (telas), `components/` (Sidebar/Header/AnexoView/ExportModal),
`context/` (AuthContext) e `services/` (camada de dados — `apiDataService`, que é o
ponto que substituiu a fonte de dados do repo externo original). CID-10 é servido como
asset estático em `public/cid10.json`, consumido por `services/cidCatalog.ts`.

Ver docs/resumo-projeto.md (seção 2, linha JustAtestados) para detalhes completos.
