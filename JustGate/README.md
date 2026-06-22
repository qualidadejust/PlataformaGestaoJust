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

## Status do teste (jun/2026) e como retomar

**Provado e funcionando** (validado injetando o payload real da Meta pelo túnel):
- ✅ Envio (Cloud API): `hello_world` chegou no celular; token + Phone Number ID OK.
- ✅ Recebimento → identificação no Core (match BR pelos últimos 8 dígitos) → resposta.
- ✅ Normalização do nº BR no envio (`normalizeBr`: recompõe o 9 que o `wa_id` perde).
- ✅ Webhook `GET` (verificação) e `POST` testados localmente e pelo túnel.

**Bloqueio (lado Meta, não código):** o registro do webhook no painel não se concretizou.
A Meta **recebe** as mensagens (aparecem no visualizador do painel) mas **não entrega** na
nossa URL. Causa provável: o **novo fluxo guiado** ("Casos de uso → Personalizar") + o aviso
de que **app não publicado** só recebe webhooks de teste — e **publicar exige verificação de
empresa** (documentos, dias).

**Caminho limpo para retomar (recomendado):**
1. **Deploy do JustGate no VPS** com **URL HTTPS fixa** (subdomínio) — acaba com o túnel
   efêmero (`trycloudflare` muda de URL a cada execução). O webhook passa a ser configurado
   **uma vez** e fica.
2. **Verificação de empresa** na Meta (necessária de qualquer forma para produção e para o
   número real) → publicar o app.
3. Então no painel: **Callback URL** = `https://<dominio-justgate>/webhook`, **Verify token**
   = `WA_VERIFY_TOKEN`, e **assinar o campo `messages`**.
4. Token permanente via **System User** (não o de 24h).

Enquanto isso, o desenvolvimento do roteamento/integração segue com **payloads simulados**
(POST no `/webhook`), que exercitam toda a lógica sem depender da Meta.

## Produção (depois)

Token permanente via **System User** (não o de 24h). Migrar para o número definitivo só
quando aceitar que ele vira API-only. No VPS: PM2 + Nginx (subdomínio) + HTTPS.
