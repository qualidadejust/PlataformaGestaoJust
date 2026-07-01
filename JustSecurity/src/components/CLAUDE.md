# src/components — componentes de UI do JustSecurity

- `FingerprintCapture.tsx` — componente central da captura de digital: tenta o agente
  local DigitalPersona (via `lib/fingerprint.ts`), mostra status em tempo real
  (conectando/aguardando dedo/qualidade) e, se o agente não responder (~4s de timeout),
  cai automaticamente no **modo simulado** para não travar o fluxo de teste.
- `TermoEntrega.tsx` — termo de entrega e responsabilidade de EPI (texto NR-06),
  **documento com valor jurídico**: mostra a assinatura biométrica, o hash de
  autenticidade da cadeia e os dados da empresa/obra (snapshot do Core no momento da
  entrega). Pensado para impressão/PDF.
- `BaixaModal.tsx` — baixa manual de ficha (sem assinatura por digital), com motivo
  (troca/desgaste/vencimento/desligamento/perda/inspeção).
- `InspecaoModal.tsx` — registra inspeção de EPI, com digital do inspetor verificada
  1:1 quando cadastrada.
- `TrocaModal.tsx` — fluxo de troca de EPI (baixa a ficha ativa e abre uma nova,
  vinculada via `substitui_ficha_id`).

Ver docs/resumo-projeto.md seção 6.
