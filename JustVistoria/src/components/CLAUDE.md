# src/components — componentes compartilhados de UI

`AssinaturaCanvas.tsx`: captura de assinatura em tela via canvas HTML5 nativo (sem lib externa),
usando pointer events (mouse e toque); expõe `onChange(dataUrl)` com o PNG resultante ou `""`
quando limpo — é o componente usado por `TermoView` para colher a assinatura do cliente antes de
gerar o PDF e o hash SHA-256 do termo. `Logo.tsx`: logo da JUST com variante clara/escura
(`variant="white"` no sidebar sobre fundo `brand-900`).

Componentes aqui devem ser genéricos (reusáveis por qualquer view) — regra de negócio específica
de tela fica em `src/views/`.

Ver `docs/resumo-projeto.md` seção 13 e skill `vistoria-entrega` para o papel do termo assinado.
