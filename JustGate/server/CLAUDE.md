# JustGate/server — lógica do gateway WhatsApp

Backend Express do JustGate (porta 4200). Cada arquivo tem uma responsabilidade única:

- **`index.ts`** — monta o Express: webhook (`GET /webhook` verifica com `WA_VERIFY_TOKEN`;
  `POST /webhook` dá ACK 200 imediato e processa depois), painel HTML em `GET /` (status +
  simulador de mensagem), `POST /simular` (roteia sem enviar), `GET /health`, `/privacy` e
  `/terms`. `handleInbound` decide entre `processarBotao` (clique em botão), `processarMidia`
  (foto/PDF) ou `route` (texto simples) — sempre depois de barrar quem não é identificado.
- **`core.ts`** — `identifyByPhone`: casa o telefone (E.164, últimos 8 dígitos) com
  `colaboradores` do Core via `GET /api/colaboradores`; tem retry (cold start do Render).
- **`router.ts`** — `route(msg, colaborador)`: roteamento por intenção (texto-chave hoje;
  esqueleto para JustAtestados/JustAccess/GED). Define o tipo `Inbound`.
- **`whatsapp.ts`** — cliente da Cloud API: `sendText`, `sendButtons`, `downloadMedia`,
  `normalizeBr` (recompõe o 9º dígito). Sem `WA_TOKEN`/`WA_PHONE_NUMBER_ID` configurados, cai em
  **modo simulado** (só loga no console) — permite testar o fluxo sem enviar mensagem real.
- **`fluxo.ts`** — orquestra a triagem de documento por WhatsApp: baixa mídia, chama
  `POST /api/triagem/documento` (IA do Core) para classificar, cria "pendente" no Core
  (`/api/gate/pendente`), manda botões Confirmar/Cancelar, e no clique grava no GED
  (`/api/gate/pendente/:id/confirmar`) ou cancela. Tudo chamado servidor-a-servidor com
  `x-internal-token` — o JustGate não tem banco próprio, o estado mora no Core.

Ver `docs/resumo-projeto.md` seção 7 e a skill `justgate-whatsapp` para o desenho completo do fluxo.
