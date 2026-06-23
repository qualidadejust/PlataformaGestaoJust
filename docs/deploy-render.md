# Deploy zero-custo — Render + Neon + SharePoint

Guia completo para colocar a Plataforma JUST no ar **sem custo**: front-ends estáticos +
um único serviço Node (gateway) + PostgreSQL no Neon + arquivos no SharePoint.

> Arquitetura e decisões: ver `resumo-projeto.md` seção 11. Dúvidas de dados: skill `banco-dados`.

```
Browser ──► static sites (Render, grátis)  ──/api,/core──►  just-gateway (Render web, $PORT)
                                                              │ proxy por path
                  ┌───────────────────────────────────────────┼─────────────────────────────┐
                  ▼            ▼            ▼          ▼        ▼            ▼
              core:4100   eleva:3001  security:4001 train:4600 frota:4300  gate:4200   (processos-filhos)
                  │            │            │          │        │
                  └────────────┴── Neon Postgres (1 banco por app) ──┘     arquivos ► SharePoint/Graph
```

## Pré-requisitos (já feitos)

- **Neon**: projeto `plataforma-just` (sa-east-1) com 5 bancos (`justcore`, `justeleva`,
  `justsecurity`, `justtrain`, `justfrota`); schema aplicado e **dados migrados** (Fase 1).
- Código no GitHub: branch `deploy-render-postgres` (`render.yaml` na raiz).

## 1. Subir o backend (gateway) + fronts pelo Blueprint

1. Render → **New → Blueprint** → conecte `PlataformaGestaoJust`, branch `deploy-render-postgres`.
   Ele lê o `render.yaml` e cria: `just-gateway` (web) + 7 static sites.
2. Preencha as variáveis `sync:false` do **just-gateway**:
   | Variável | Valor |
   |---|---|
   | `DATABASE_URL_CORE` … `_FROTA` | as 5 strings **pooled** do Neon (mesma credencial, troca o nome do banco no fim) |
   | `SP_TENANT_ID`, `SP_CLIENT_ID`, `SP_CLIENT_SECRET` | do `.env` do Core (App registration Azure) |
   | `BIOMETRIA_URL` | vazio por ora (ver seção 3) |
3. **Apply / Deploy.** As `VITE_*` dos fronts são preenchidas automaticamente (`fromService`).

> Os static sites apontam para o gateway via `VITE_GATEWAY` (host do gateway). O interceptor
> `src/api-base.ts` prefixa `/api` e `/core` em produção; em dev é no-op (proxy do Vite).

## 2. Validar

- `https://just-gateway.onrender.com/health` → `{ ok: true, ... }`
- `…/core/api/health`, `…/eleva/api/health`, `…/security/api/health`, `…/train/api/health`,
  `…/frota/api/health` → 200; `…/gate/health` → 200
- Abra `just-hub.onrender.com` (portal) e navegue para cada módulo.

> **Cold start**: no free tier o gateway dorme após 15 min ocioso; a 1ª chamada demora ~50s.
> **Memória**: 6 processos + proxy em 512 MB é apertado. Se houver OOM/reinício, mescle apps
> ou suba o gateway para a instância paga (US$7/mês) — não muda a arquitetura.

## 3. Biometria (EPI assinado por digital) — totem local + túnel

O leitor HID U.are.U 4500 e o serviço **.NET SourceAFIS** (match) só rodam em **Windows**
(o totem na obra/escritório). O gateway na nuvem precisa alcançar esse `.NET` para o match 1:N:

1. No **totem**, suba o serviço .NET: `dotnet run --project JustSecurity/biometria -c Release`
   (porta 4002) e instale o **DigitalPersona Lite Client** (captura no navegador).
2. Exponha a 4002 com um **túnel grátis** (Cloudflare Tunnel):
   `cloudflared tunnel --url http://localhost:4002` → gera uma URL estável.
3. No Render, defina `BIOMETRIA_URL` do gateway com essa URL. Pronto: a entrega de EPI no
   totem captura a digital (local) e o backend na nuvem faz o match via túnel.

> O totem só precisa estar ligado **quando há entrega/treinamento** — fora disso, sem biometria,
> o resto da plataforma funciona normal. Alternativas (SDK Android, WebAuthn) na seção 11 do resumo.

## 4. Migrations futuras (mudança de schema)

O build roda `prisma generate`, **não** `migrate deploy` (o pooler do Neon não suporta os
advisory locks do migrate). Ao mudar schema, rode localmente apontando para a conexão **direta**
(sem `-pooler`) de cada banco:

```bash
cd <app> && DATABASE_URL="postgresql://…@ep-xxxx.sa-east-1.aws.neon.tech/<db>?sslmode=require" npm run db:deploy
```

## Mapa de variáveis por serviço

| Serviço | Variáveis |
|---|---|
| `just-gateway` | `DATABASE_URL_CORE/_ELEVA/_SECURITY/_TRAIN/_FROTA`, `STORAGE_DRIVER=sharepoint`, `SP_*`, `BIOMETRIA_URL`, `MATCH_THRESHOLD` |
| `just-*-web` (fronts) | `VITE_GATEWAY` (auto), `VITE_API_PREFIX` (fixo no render.yaml) |
| `just-hub` | `VITE_GATEWAY` + `VITE_URL_*` (auto, dos outros sites) |
