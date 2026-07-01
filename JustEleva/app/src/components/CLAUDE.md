# src/components — componentes reutilizáveis do front

Componentes compartilhados entre várias views: `Header.tsx`, `Sidebar.tsx` (menu principal, com o gating por perfil e a lista de itens de navegação — toda tela nova precisa de uma entrada aqui) e `Logo.tsx` (logo oficial da JUST em `public/logos/`, com fallback de texto quando a imagem não carrega).

Diferente de `src/views/` (uma tela inteira por arquivo), aqui ficam blocos de UI reaproveitados por múltiplas telas. Ao criar um componente novo de uso genérico (não específico de uma view), coloque-o aqui; componente usado só por uma view fica dentro do próprio arquivo da view.

Ver AGENTS.md e docs/resumo-projeto.md (deste app) para o tema de marca (`brand-*`, navy `#0e2148`) e convenções de UI aplicadas nesses componentes.
