# JustHub/src/components — componentes visuais do portal

Só o `Logo.tsx` hoje: logo oficial da Construtora JUST (`variant="navy"|"white"`), lida de
`public/logos/` (`logo-just.png` / `logo-just-white.png`); se a imagem falhar (`onError`), cai
num wordmark de texto on-brand em vez de quebrar o layout.

Os cards de módulo (`Card`, `StatusDot`) ainda vivem direto em `../App.tsx` (app de tela
única, sem necessidade de separar mais componentes por enquanto).

Ver docs/resumo-projeto.md (seção 2, linha JustHub, e seção 11) para detalhes completos.
