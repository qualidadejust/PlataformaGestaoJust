# JustTrain/src/components — componentes de assinatura

**`AssinaturaModal.tsx`** — modal com 2 métodos de assinatura de presença: `tela` (usa
`SignaturePad`) ou `digital` (usa `FingerprintCapture`); envia `assinatura_img` (base64) +
`assinatura_tipo` para `POST /api/participacoes/:id/assinar`. Bloqueia o método digital se o
participante não tem `colaborador_id` (sem cadastro biométrico no Core para verificar 1:1).

**`SignaturePad.tsx`** — assinatura manuscrita num `<canvas>` (mouse/toque), devolve PNG em
base64 no mesmo formato usado pela digital.

**`FingerprintCapture.tsx`** — reaproveitado do JustSecurity: tenta o agente local
DigitalPersona/WebSDK (leitor HID U.are.U 4500); sem agente, cai em modo **simulado** para
testar o fluxo. A imagem capturada vira `assinatura_img` e também o probe da verificação
biométrica 1:1 no backend (`server/lib/biometria.ts`).

Ver docs/resumo-projeto.md (tabela de apps / seção 2, diagrama) para o contexto de arquitetura.
