# src/views — telas do pipeline, checklist e pendências

`EspelhoView.tsx`: visão geral tipo quadro (Mobuss) — todas as unidades × situação das 4 etapas +
contagem de NCs abertas/críticas, com filtro por obra (`GET /api/espelho`). `PipelineView.tsx`:
detalhe de uma unidade — as 4 etapas (Construção→Inspeção Final→Vistoria do Cliente→Entrega das
Chaves), status previsto×realizado, e ponto de entrada para o checklist (`FormularioView`) e o
termo (`TermoView`); mostra a Construção e suas pendências vindas do cronograma
(`GET /api/unidades/:id/construcao`) e libera a Inspeção Final só quando concluída.
`FormularioView.tsx`: renderiza o checklist FVC (motor de formulários), captura conforme/NC/NA +
foto/obs por item e envia para `POST /api/instancias` (que abre as NCs automaticamente).
`PendenciasView.tsx`: lista de pendências agrupada por disciplina (`categoria`) para gestão e
distribuição a equipes, com filtros de severidade/status. `TermoView.tsx`: assinatura em tela
(usa `AssinaturaCanvas`), gera o PDF (jsPDF) e envia para `POST /api/termos`. `RelatorioView.tsx`:
resumo de entrega da unidade (etapas+itens+NCs+termos) para exportar/arquivar no GED.

Ver `docs/resumo-projeto.md` seção 13 e skill `vistoria-entrega` para as regras de bloqueio por NC
crítica e o fluxo de cada tela.
