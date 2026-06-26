# JustGate — gateway WhatsApp da Plataforma JUST

Serviço Node/Express (porta **4200**) que recebe mensagens do WhatsApp, **identifica o
remetente consultando o JustCore** (pelo telefone) e **roteia** para o módulo certo. Não tem
cadastro próprio — o Core é a fonte de verdade. Ver skill `justgate-whatsapp`.

## Rodar (dev)

```bash
cd JustGate
npm install
cp .env.example .env   # preencher quando tiver o app da Meta (em dev funciona simulado)
npm run dev            # http://localhost:4200
```

Sem `WA_TOKEN`/`WA_PHONE_NUMBER_ID`, o envio fica em **modo simulado** (loga no console) —
dá para testar o fluxo todo sem mandar mensagem real. **Suba o JustCore (4100) antes**, para
a identificação funcionar.

## Endpoints

- `GET /health` — status + se o WhatsApp está `configurado` ou `simulado`.
- `GET /webhook` — verificação (a Meta chama ao configurar; devolve o `hub.challenge`).
- `POST /webhook` — recebimento de mensagens (ACK 200 imediato + processamento).

## Conectar à WhatsApp Cloud API (número de TESTE da Meta)

> ⚠️ **Não use o número real da empresa para testar.** Registrar um número na Cloud API o
> torna exclusivo da API (perde o uso no app do WhatsApp). Use o número de teste da Meta.

1. **App de desenvolvedor:** `developers.facebook.com` → criar app (tipo *Business*) →
   adicionar o produto **WhatsApp**.
2. Na seção WhatsApp você recebe um **número de teste**, o **Phone number ID** e um **token
   temporário (24h)**. Adicione seu **celular pessoal** como número de destino verificado.
3. Preencha o `.env`: `WA_PHONE_NUMBER_ID`, `WA_TOKEN`, e escolha um `WA_VERIFY_TOKEN`.
4. **Túnel** para o webhook chegar no localhost (a Meta exige HTTPS público):
   ```bash
   npx cloudflared tunnel --url http://localhost:4200   # ou: ngrok http 4200
   ```
   Copie a URL https gerada.
5. No painel da Meta (WhatsApp → Configuração), configure o **Callback URL** =
   `https://SEU-TUNEL/webhook` e o **Verify token** = o mesmo `WA_VERIFY_TOKEN`. Assine o
   campo **messages**.
6. Mande um WhatsApp do seu celular para o número de teste → cai no `POST /webhook`.

## Status do teste (jun/2026) — FUNCIONANDO via Render

✅ **Ciclo completo provado** (envio + recebimento + resposta) com o JustGate rodando no
**gateway do Render** (`https://just-gateway.onrender.com`, rota `/gate`). Um WhatsApp do
celular cadastrado cai no webhook, é identificado no Core e recebe resposta.

**Webhook no painel da Meta (config que vale):**
- **URL de callback** = `https://just-gateway.onrender.com/gate/webhook` (NÃO o túnel
  `trycloudflare` — aquele é efêmero e morre; era a causa de "não chega resposta").
- **Verificar token** = o `WA_VERIFY_TOKEN` configurado no Render (`just-gate-verify`).
- **Campos do webhook:** assinar **`messages`**.

> ⚠️ **Se parar de responder, suspeite PRIMEIRO da URL de callback.** Se algum dia alguém
> reabrir um túnel `trycloudflare`/`ngrok` e reapontar o webhook, a URL muda e tudo some.
> A URL boa é a do Render (fixa). Confira em WhatsApp → Configuração → Configurar webhooks.

**Limite atual (lado Meta):** o app **ainda não está publicado**, então só números que são
**admin/dev/testador** do app recebem webhooks de teste. Para valer pra qualquer colaborador,
**publicar o app** → exige **verificação da empresa** na Meta.

**Para produção:** token permanente via **System User** (não o de 24h) no `WA_TOKEN` do Render.

Para desenvolver o roteamento sem depender da Meta, ainda dá pra usar **payloads simulados**
(POST no `/webhook`) ou o simulador do painel (`/simular`).

## Produção (depois)

Token permanente via **System User** (não o de 24h). Migrar para o número definitivo só
quando aceitar que ele vira API-only. No VPS: PM2 + Nginx (subdomínio) + HTTPS.
