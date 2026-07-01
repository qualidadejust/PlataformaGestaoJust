# src/lib — helpers do front

Hoje contém só `utils.ts`, com o helper `cn()` (clsx + tailwind-merge) usado em todo o app para compor classes Tailwind condicionais — é o padrão obrigatório para classes condicionais citado em AGENTS.md/CLAUDE.md raiz.

Se surgir outro helper puro de front (formatação, cálculo compartilhado entre views, etc.) sem estado nem chamada de API, ele entra aqui — não em `src/hooks/` (que é a camada de dados) nem dentro de uma view específica.

Ver AGENTS.md e docs/resumo-projeto.md (deste app) para os padrões de código do projeto.
