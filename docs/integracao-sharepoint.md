# Integração SharePoint / Microsoft Graph — config

Configuração do armazenamento de arquivos da Plataforma JUST (ver estratégia na seção 10 de
[`resumo-projeto.md`](resumo-projeto.md)). **O segredo do cliente NÃO fica aqui** — vai só
no `.env` do VPS.

## Identificadores (não são secretos)

| Item | Valor |
|---|---|
| App registration | `Plataforma JUST - Storage` |
| **Client ID** (ID do aplicativo) | `684287b3-ab2c-48f0-ab44-e340b2557f5c` |
| **Tenant ID** (ID do diretório/locatário) | `1b1ff105-2889-46b4-b70e-5891b86a9477` |
| Permissão Graph | `Sites.Selected` (Application) |
| Site SharePoint | `https://justconstrutora.sharepoint.com/sites/PlataformaJust` |
| Biblioteca destino | `Documentos` (padrão do site) |

## `.env` do VPS (modelo — preencher o segredo lá, nunca versionar)

```
STORAGE_DRIVER=sharepoint
SP_TENANT_ID=1b1ff105-2889-46b4-b70e-5891b86a9477
SP_CLIENT_ID=684287b3-ab2c-48f0-ab44-e340b2557f5c
SP_CLIENT_SECRET=<valor-do-segredo-gerado-no-Entra>
SP_SITE=justconstrutora.sharepoint.com:/sites/PlataformaJust
```

Em dev/localhost: `STORAGE_DRIVER=local` (salva em `storage/`, não precisa do SharePoint).

## Status — ✅ FUNCIONANDO (testado jun/2026)

SharePoint **integrado e validado em produção real**: upload (incl. binário com hash
idêntico) cai no site `PlataformaJust`, download mediado funciona, arquivo sensível sem link
direto (`web_url` null), delete remove do SharePoint. Concluído:
- ✅ Consentimento admin do `Sites.Selected` (concedido pelo Global Admin).
- ✅ App liberado para o site (POST `/sites/{id}/permissions` com `roles:["write"]`).
- ✅ `JustCore/.env` com `STORAGE_DRIVER=sharepoint` + `SP_*` (segredo só no `.env`, gitignored).
- ✅ Core carrega `.env` via `dotenv` (`import "dotenv/config"` no `server/index.ts`).

`site id` (PlataformaJust): `justconstrutora.sharepoint.com,5ad97f96-12d1-471f-803f-14a126e189c3,c55c9245-2dea-45d4-a022-d9add247a718`.

> Histórico das pendências (já resolvidas) abaixo, para referência de como refazer em outro
> ambiente (ex.: VPS / novo site).

## Pendências (ambas exigem Administrador do tenant)

1. **Consentimento admin** da permissão `Sites.Selected` (ver pacote para o TI abaixo).
2. **Liberar o app só para o site** `PlataformaJust` via Graph (`Sites.Selected` = mínimo
   privilégio: o app só enxerga este site).

## Pacote para o TI / Administrador

### Parte 1 — Conceder consentimento (1 clique)
Entra (`entra.microsoft.com`) → Identidade → Aplicativos → Registros de aplicativo →
**Plataforma JUST - Storage** → Permissões de API →
**Conceder consentimento do administrador para JUST** → confirmar (status do
`Sites.Selected` deve ficar verde "Concedido").

### Parte 2 — Liberar o app só para o site (Graph Explorer, sem instalar nada)
Logado como admin em `https://developer.microsoft.com/graph/graph-explorer`:

1. Obter o ID do site:
   ```
   GET https://graph.microsoft.com/v1.0/sites/justconstrutora.sharepoint.com:/sites/PlataformaJust
   ```
   Copiar o campo `id` (formato `hostname,guid,guid`).

2. Conceder permissão de escrita ao app neste site:
   ```
   POST https://graph.microsoft.com/v1.0/sites/{id-do-passo-1}/permissions
   ```
   Corpo (JSON):
   ```json
   {
     "roles": ["write"],
     "grantedToIdentities": [
       { "application": { "id": "684287b3-ab2c-48f0-ab44-e340b2557f5c", "displayName": "Plataforma JUST - Storage" } }
     ]
   }
   ```
   > O Graph Explorer pode pedir consentimento da permissão delegada `Sites.FullControl.All`
   > para o admin conseguir fazer o POST — é esperado, é só aceitar.
