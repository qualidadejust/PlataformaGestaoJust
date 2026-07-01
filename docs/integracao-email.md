# Integração de e-mail (Microsoft 365 via Graph)

Serviço de e-mail **transversal do JustCore** para notificações, avisos, cobranças e relatórios.
Mesma filosofia do storage/GED: **uma interface, driver por env** — `console` (dev, só loga) ×
`graph` (prod, envia pelo Microsoft 365). Reusa a **mesma credencial Graph** (app-only) já usada
pelo SharePoint — uma só app registration, um só segredo no servidor.

## Como funciona

- **Código:** `JustCore/server/lib/email/` (`types.ts`, `console.ts`, `graph.ts`, `index.ts`) +
  token compartilhado em `JustCore/server/lib/graph/token.ts`.
- **Envio:** `enviarEmail({ to, subject, html|texto, cc?, replyTo? })`. Em prod, faz
  `POST https://graph.microsoft.com/v1.0/users/{EMAIL_FROM}/sendMail`.
- **Template:** `layoutPtBr({ titulo, corpo, cta? })` — wrapper HTML pt-BR com a marca JUST,
  base reutilizável para qualquer e-mail.
- **Rotas (Core 4100, permissão `core.email.write`):**
  - `POST /api/emails/enviar` — corpo `EmailInput`. Consumido por telas (JWT) e por outros apps
    (server-to-server via `x-internal-token`, como no GED).
  - `POST /api/emails/testar` — corpo `{ para }`; manda um e-mail-modelo (valida a config M365).
- **Auditoria:** cada envio registra `logAcesso` (`email_enviado`/`email_teste`/`email_falha`) —
  **sem** gravar corpo nem destinatário (LGPD).
- **Rate limit anti-abuso:** `server/lib/rate-limit.ts` limita envios por ator (usuário/IP),
  `EMAIL_RATE_MAX`/`EMAIL_RATE_WINDOW_MS` (default 60/min). Chamadas internas (`x-internal-token`)
  são **isentas** — apps confiáveis, um digest pode disparar em lote. Excedeu → HTTP 429.

## Variáveis de ambiente (`.env` do Core)

```
EMAIL_DRIVER=console|graph            # default console (dev)
EMAIL_FROM=naoresponda@construtorajust.com.br
# EMAIL_REPLY_TO=ti@construtorajust.com.br   # opcional
# Reusa SP_TENANT_ID / SP_CLIENT_ID / SP_CLIENT_SECRET (mesma app do SharePoint).
```

## Configuração no Microsoft 365 (uma vez)

1. **Caixa compartilhada** `naoresponda@construtorajust.com.br` no M365 Admin → Equipes e grupos
   → Caixas de correio compartilhadas. **Shared mailbox é grátis** (não consome licença, até 50 GB).
   É o remetente (`EMAIL_FROM`).
2. **Azure AD (Entra ID) → App registrations →** a app que já existe (do SharePoint) → **API
   permissions** → adicionar **Microsoft Graph → Application permissions → `Mail.Send`** →
   **Grant admin consent**.
3. **Restringir o alcance (segurança — importante):** por padrão `Mail.Send` de aplicação permite
   enviar como **qualquer** caixa do tenant. Restringir com **Application Access Policy** (Exchange
   Online PowerShell) para a app só poder enviar da caixa `naoresponda@`:
   ```powershell
   Connect-ExchangeOnline
   # grupo de segurança mail-enabled contendo SÓ a caixa naoresponda@
   New-DistributionGroup -Name "App-Email-Just" -Type Security -Members naoresponda@construtorajust.com.br
   New-ApplicationAccessPolicy -AppId <SP_CLIENT_ID> `
     -PolicyScopeGroupId App-Email-Just@construtorajust.com.br `
     -AccessRight RestrictAccess -Description "App só envia como naoresponda@"
   # validar:
   Test-ApplicationAccessPolicy -Identity naoresponda@construtorajust.com.br -AppId <SP_CLIENT_ID>
   ```
4. No `.env` do servidor: `EMAIL_DRIVER=graph` + `EMAIL_FROM` (o `SP_CLIENT_SECRET` já existe).

## Validação

- **Dev (sem M365):** `EMAIL_DRIVER=console`, subir o Core, `POST /api/emails/testar` com
  `{ "para": "voce@construtorajust.com.br" }` → o e-mail aparece logado no console.
- **Prod (M365):** após os passos acima, `EMAIL_DRIVER=graph` + `POST /api/emails/testar` →
  confirmar o recebimento real e o registro `email_teste` na auditoria (`/api/acessos/logs`).

## Checklist LGPD para os gatilhos (OBRIGATÓRIO ao implementar cada e-mail)

E-mail é **canal inseguro** — o corpo trafega e fica em caixas fora do nosso controle. Antes de
ligar qualquer gatilho, passe por este checklist (skill `lgpd-compliance`):

1. **Nunca dado sensível no corpo/assunto** — sem CID, ASO, diagnóstico, aptidão, CPF completo,
   dado bancário. Envie **aviso + link para a tela**, não o dado em si.
2. **Arquivo sensível do GED: nunca anexar nem mandar `web_url`/link público.** O e-mail leva só
   um **CTA para a tela** → o download continua **mediado** pelo back (login → checa perfil →
   `logAcesso` → stream). Só arquivo **não sensível** (ex.: foto de obra) pode ir por link direto.
3. **Minimização** — "Você tem 1 atestado pendente de aprovação", não o motivo/CID. Mascarar CPF.
4. **Base legal por gatilho** — SST/saúde (vencimento de ASO, C.A. de EPI) → obrigação legal;
   operacional interno (NC, prazos, avaliações) → execução de contrato / legítimo interesse.
   Consentimento é último recurso (revogável).
5. **Auditar o envio, não o conteúdo** — manter `email_enviado` (+ opcionalmente o tipo de
   gatilho e nº de destinatários). **Nunca** logar corpo/dado sensível.
6. **Retenção da caixa** — os "Itens Enviados" da caixa compartilhada guardam cópia; manter o
   conteúdo sem dado sensível (item 1) e definir retenção reforça a conformidade.

## Próximos passos (ainda não implementados)

- **Gatilhos por evento:** vencimentos do GED, C.A. de EPI, NC de FVS/Vistoria, atestados
  pendentes de RH, avaliações do JustEleva — cada app chama `POST /api/emails/enviar`
  (seguindo o checklist LGPD acima).
- **Relatórios agendados:** endpoint protegido por segredo chamado por **cron externo grátis**
  (cron-job.org / GitHub Actions) no Render; troca por **node-cron** na Hostinger.
