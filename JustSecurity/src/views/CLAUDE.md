# src/views — telas do JustSecurity

Uma tela por arquivo, registradas em `App.tsx`:

- `EntregaEpiView.tsx` — fluxo principal: seleciona colaborador/EPI (do Core),
  captura a digital (`FingerprintCapture`) e registra a entrega assinada
  (`POST /api/entregas`), com verificação biométrica 1:1 quando o colaborador já tem
  digital cadastrada.
- `HistoricoView.tsx` — histórico de entregas com a assinatura (imagem) e o resultado
  da verificação biométrica de cada registro.
- `FichasView.tsx` — gestão das fichas de EPI (status calculado por `lib/status.ts`):
  inspecionar (`InspecaoModal`), trocar (`TrocaModal`), baixar (`BaixaModal`).
- `RelatorioView.tsx` — relatórios/consultas agregadas (fichas, entregas).

Todas consomem dados via `hooks/useEpi.ts`; nenhuma view acessa `fetch`/Prisma direto.

Ver docs/resumo-projeto.md seção 6.
