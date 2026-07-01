# src/lib — utilitários do front, com foco no fluxo de biometria

- `status.ts` — **derivação de status** de exibição: `STATUS_META` (badge/cor por
  status operacional da ficha: em_dia, vencimento_proximo, inspecao_proxima,
  inspecionar, troca_imediata, baixada, consumida) + labels de motivo de baixa e de
  resultado de inspeção + formatação de data pt-BR (`fmtData`/`fmtDataHora`).
- `fingerprint.ts` — wrapper do leitor HID U.are.U 4500. `createRealReader()` carrega
  `@digitalpersona/devices` dinamicamente e escuta os eventos do agente local (via
  global `window.WebSdk`, injetado por `<script>` clássico no `index.html`, não
  bundlado). Se o agente **não responder**, quem chama (`FingerprintCapture`) cai no
  modo simulado chamando `gerarSimulado()` (desenha um PNG fake num canvas). Quando o
  agente for instalado, o fluxo troca para digital real automaticamente, sem mudar
  código.
- `websdk-stub.ts` — stub vazio para o import `'WebSdk'` que `@digitalpersona/devices`
  faz só por efeito colateral; resolvido via alias no `vite.config.ts`.
- `empresa.ts` / `utils.ts` — helpers gerais (inclui `cn()` e o wrapper `api()`).

Ver docs/resumo-projeto.md seção 6, subseção "Como a digital funciona".
