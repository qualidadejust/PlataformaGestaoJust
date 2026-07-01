# Configuração de e-mail do sistema — pedido ao administrador do Microsoft 365

**Para:** administrador do Microsoft 365 / TI
**Assunto:** liberar o envio de e-mails automáticos da Plataforma de Gestão JUST

O nosso sistema vai passar a enviar e-mails automáticos (avisos, lembretes, cobranças e
relatórios). Para isso, precisamos de **3 coisas**, todas feitas por um administrador. Nada disso
consome licença paga. Abaixo, em ordem, com o "porquê" e o "como".

Reaproveitamos o aplicativo do Azure que **já existe** (o mesmo que hoje guarda arquivos no
SharePoint):
- **Aplicativo (Client ID):** `684287b3-ab2c-48f0-ab44-e340b2557f5c`
- **Organização (Tenant ID):** `1b1ff105-2889-46b4-b70e-5891b86a9477`

---

## Passo 1 — Criar a caixa de e-mail "não-responda" (no painel, com cliques)

**O que é:** um endereço só para o sistema mandar os e-mails automáticos: `naoresponda@construtorajust.com.br`.

**Por que:** os avisos automáticos precisam sair de um endereço "oficial do sistema", não do e-mail
de uma pessoa. É o mesmo "não-responda" que banco/loja usam. **Não gasta licença** — é uma *caixa
compartilhada*, que é gratuita.

**Como:**
1. Acessar **admin.microsoft.com** (Centro de administração do Microsoft 365).
2. Menu **Equipes e grupos → Caixas de correio compartilhadas**.
3. **Adicionar uma caixa de correio compartilhada** → nome "Não responda", e-mail
   `naoresponda@construtorajust.com.br` → salvar.

---

## Passo 2 — Liberar a permissão de envio (no portal do Azure, com cliques)

**O que é:** autorizar o aplicativo a enviar e-mail (permissão chamada **`Mail.Send`**).

**Por que:** sem essa autorização, o sistema não consegue enviar nada. Usamos o modo
"aplicativo" (sem senha de usuário), que é o recomendado e seguro.

**Como:**
1. Acessar **portal.azure.com** → **Microsoft Entra ID** (antigo Azure Active Directory).
2. **Registros de aplicativo (App registrations)** → abrir o app do Client ID
   `684287b3-ab2c-48f0-ab44-e340b2557f5c`.
3. Menu lateral **Permissões de API (API permissions)**.
4. **Adicionar uma permissão** → **Microsoft Graph** → **Permissões de aplicativo** (NÃO
   "delegadas") → buscar **`Mail.Send`** → marcar → **Adicionar permissões**.
5. Clicar em **Conceder consentimento de administrador (Grant admin consent)**.
   → A linha do `Mail.Send` tem que ficar com o **✔ verde**.

---

## Passo 3 — Colocar a trava de segurança (comandos, no Exchange Online PowerShell)

**O que é:** uma regra que prende o sistema a **enviar só pela caixa `naoresponda@`**, e por
nenhuma outra.

**Por que:** por padrão, a permissão do Passo 2 deixaria o sistema enviar e-mail **como se fosse
qualquer pessoa da empresa** (inclusive diretoria/RH). Isso é perigoso. Esta trava fecha isso — é
como dar a chave de **um** armário em vez da chave-mestra do prédio.

**Como:** isto **não é no painel** — é digitando comandos no **Exchange Online PowerShell**
(ferramenta de administração do Microsoft). Colar um por vez:

```powershell
# (só na 1ª vez, se a ferramenta ainda não estiver instalada)
Install-Module ExchangeOnlineManagement

# 1) Conectar (abre um login do Microsoft)
Connect-ExchangeOnline

# 2) Criar um grupo de segurança contendo SÓ a caixa naoresponda@
New-DistributionGroup -Name "App-Email-Just" -Type Security -Members naoresponda@construtorajust.com.br

# 2b) Descobrir o endereço/GUID REAL do grupo — o SMTP costuma sair no domínio padrão
#     (ex.: App-Email-Just@justconstrutora.onmicrosoft.com), NÃO em @construtorajust.com.br.
#     Use o GUID no passo 3 para evitar "the identity of the policy scope could not be resolved".
Get-DistributionGroup -Identity "App-Email-Just" | Format-List Name,PrimarySmtpAddress,Guid

# 3) A trava: o app só pode enviar pelas caixas desse grupo.
#    Passe o GUID do passo 2b em -PolicyScopeGroupId (GUID nunca é ambíguo).
New-ApplicationAccessPolicy -AppId 684287b3-ab2c-48f0-ab44-e340b2557f5c `
  -PolicyScopeGroupId <GUID-do-grupo-App-Email-Just> `
  -AccessRight RestrictAccess `
  -Description "App Just so envia pela caixa naoresponda@"

# 4) Conferir (tem que dizer AccessCheckResult: Granted para a naoresponda@)
Test-ApplicationAccessPolicy -Identity naoresponda@construtorajust.com.br -AppId 684287b3-ab2c-48f0-ab44-e340b2557f5c
```

> Observação: a política pode levar alguns minutos (às vezes até ~30 min) para valer em toda a
> organização.
>
> Se o `New-DistributionGroup` reclamar *"multiple recipients matching identity App-Email-Just"*,
> o grupo já existe — pule o passo 2 e siga do 2b. Se o `New-ApplicationAccessPolicy` disser
> *"the identity of the policy scope could not be resolved"*, foi por usar o endereço `.com.br`
> em vez do GUID/SMTP real do grupo (passo 2b).

---

## Depois disso (é comigo — equipe do sistema)

Com os 3 passos prontos, eu ligo o envio no sistema (`EMAIL_DRIVER=graph`) e fazemos um e-mail de
teste para confirmar que está chegando. Não precisa de mais nada do administrador.

**Resumo em uma linha:** conceder ao app do Azure (`684287b3-…`) a permissão **Microsoft Graph →
Mail.Send (Application)** com consentimento de admin, criar a caixa compartilhada
**naoresponda@construtorajust.com.br** e rodar os comandos do Passo 3 para restringir o app a essa
caixa.
