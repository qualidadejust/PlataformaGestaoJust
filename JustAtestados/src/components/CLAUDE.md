# src/components/ — componentes compartilhados do JustAtestados

`Sidebar.tsx` — menu lateral; cada item declara os perfis (`roles`) que podem vê-lo
(`ALL_MENU_ITEMS`), é a fonte do gating visual (par ao `VIEWS_BY_ROLE` do `App.tsx`).
`Header.tsx` — topo com busca global (dispara navegação para `Registry`) e toggle de tema
escuro. `AnexoView.tsx` — exibição do anexo do atestado (documento sensível, download
mediado pelo GED do Core — nunca expõe URL direta). `ExportModal.tsx` — exportação de
dados (ex.: relatórios/KPIs). `JustLogo.tsx` — logo da marca (navy/white conforme tema).

Ao adicionar um item de menu novo, siga o padrão de `Sidebar.tsx` (roles) + `App.tsx`
(`VIEWS_BY_ROLE`/`HOME_BY_ROLE`).

Ver docs/resumo-projeto.md (seção 2, linha JustAtestados) para detalhes completos.
