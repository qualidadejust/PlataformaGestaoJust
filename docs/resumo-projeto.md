# Resumo do Projeto — Plataforma de Gestão JUST

> Documento de referência de **estrutura técnica e arquitetura** do monorepo. Use-o
> para reforçar os padrões existentes em toda requisição e **evitar reexplorar o
> código**. Toda mudança que altere stack, arquitetura, portas, schema ou integração
> entre apps **deve atualizar este arquivo**.

## 1. O que é

Monorepo da plataforma de gestão da **Construtora JUST**. Vários apps que
compartilham um **único núcleo de dados-mestre (JustCore)**. UI 100% em **pt-BR**.
Decisão central: o JustCore é o dono dos cadastros; cada app guarda **só as suas
transações** e referencia os IDs do Core (com snapshot dos dados na hora da transação).

## 2. Apps e mapa de portas

| App | Pasta | Front | Back | Papel |
|---|---|---|---|---|
| **JustHub** | `JustHub/` | 4500 | — | **Portal**: tela única com cards de todos os módulos (status no ar/offline via `/api/health`) — ponto de entrada da plataforma. Front-only, sem DB. |
| **JustCore** | `JustCore/` | 4101 | 4100 | Dados-mestre (empresas, obras, colaboradores, cargos, setores, fornecedores, insumos/EPIs, indicadores, **biometria/templates**). Fonte única. |
| **JustEleva** | `JustEleva/app/` | 3000 | 3001 | Gestão de desempenho: avaliações por competência, PDI, feedback, movimentação, calibração, pesquisa de clima, indicadores. |
| **JustSecurity** | `JustSecurity/` | 4000 | 4001 | Segurança do Trabalho: entrega de EPI assinada por **digital (HID U.are.U 4500)**, fichas de EPI, inspeção/troca/baixa, relatórios. |
| **JustTrain** | `JustTrain/` | 4601 | 4600 | **Treinamentos**: catálogo (tipo NR/integração/IT/sistema; setor/carga/validade) → turmas **internas** (presença assinada: canvas ou digital HID 4500, verificação 1:1 via Core, cadeia de hash) **ou externas** (SECONCI/SENAI etc., presença `declarado` sem assinatura) → **certificado único** arquivado no **GED** do colaborador; **avaliação de eficácia 30 dias** (PBQP-H); **matriz cargo×treinamento** (conformidade: em dia/pendente/vencido); **Calendário** (turmas agendadas, eficácias pendentes, certificados vencendo nos próximos 12 meses). Snapshot do Core; biometria reaproveita o fluxo do Security. |
| **JustGate** | `JustGate/` | — | 4200 | Gateway **WhatsApp (Meta Cloud API)**: recebe mensagem, identifica o remetente no Core (pelo telefone) e roteia para o módulo. Sem cadastro próprio. |
| **JustFrota** | `JustFrota/` | 4301 | 4300 | **Gestão de frota**: diário de bordo (viagens) + custos (abastecimento/manutenção/fixos) + **rateio por km** entre as obras. Guarda só transações; veículo/motorista/obra vêm do Core. |
| **JustDocs** | `JustDocs/` | 4400 | — | **GED** (gestão eletrônica de documentos): UI com 3 abas — **Pastas** (navegação tipo SharePoint: SGQ/Obras/Pessoas/Empresa), **Documentos** (enviar/consultar/versionar) e **Vencimentos**. **Sem back/DB próprio** — consome a API do Core (proxy `/api`→4100); arquivos no SharePoint. |
| **Biometria (.NET)** | `JustSecurity/biometria/` | — | 4002 | Serviço **SourceAFIS** (.NET) que faz o **match 1:N** das digitais. Consumido por Core e Security via HTTP. |

> **Suba o JustCore primeiro** — os demais dependem dele para os cadastros.

```
JustCore (4100)  ──►  dados-mestre (SQLite + Prisma)  ◄── BiometriaDigital (templates)
   ▲     ▲     ▲
   │     │     └── JustSecurity (4001) — entregas de EPI, fichas    ──► Biometria .NET (4002) /match
   │     │     └── JustTrain (4600)    — treinamentos: presença assinada ──► Biometria .NET (4002)
   │     └──────── JustEleva (3001)    — avaliações de desempenho
   ├────────────── JustGate (4200)     — WhatsApp: identifica remetente e roteia
   ├────────────── JustFrota (4300)    — frota: viagens + rateio por km entre obras
   └────────────── JustDocs (4400)     — GED: UI de documentos (consome a API do Core)
JustHub (4500) — portal: cards de todos os módulos (entrada única, sem DB)
JustTrain → gera o PDF do certificado (jsPDF, no front) e o arquiva no GED do Core (POST /api/documentos, tipo certificado_treinamento)
WhatsApp (Meta Cloud API) ──► JustGate (4200) ──► identifica no Core ──► módulo certo
Biometria .NET (4002) ◄── Core e Security mandam probe+candidates; devolve bestScore/bestIndex
```

## 3. Stack (comum aos apps web)

- **React 19** + **Vite 6** + **TypeScript** (`tsc --noEmit` como lint, sem ESLint).
- **Tailwind CSS v4** via `@tailwindcss/vite` (config no CSS, não em `tailwind.config`).
- **@tanstack/react-query** (dados), **lucide-react** (ícones), **clsx + tailwind-merge** (`cn()`).
- Backend: **Express 4** + **Prisma 7** (todos os apps com dados — Core/Eleva/Security/Train/Frota).
- Banco: **PostgreSQL** por app (provider `postgresql`, adapter `@prisma/adapter-pg`), via
  **Neon** (free tier persistente) — `DATABASE_URL` no `.env`, lido em `prisma.config.ts` e no
  client. IDs em **UUID**, tabelas **snake_case** (legado do Security: `id` Int/datas String,
  válidos no Postgres). **No Prisma 7 a URL não vai no `schema.prisma`** (só o `provider`); fica
  no `prisma.config.ts` (`datasource.url = process.env.DATABASE_URL`). Migrar de Postgres p/
  outro Postgres é só trocar a URL.
- Biometria: **.NET + SourceAFIS** (matching) + **@digitalpersona/websdk** (captura no cliente).

## 4. JustCore — dados-mestre

- `prisma/schema.prisma` — provider `sqlite`. **Modelos**: `Empresa`, `Cargo`, `Obra`,
  `Colaborador`, `BiometriaDigital`, `Alocacao`, `Fornecedor`, `Setor`, `Indicador`, `Insumo`,
  `TipoDocumento`, `Documento`, `Veiculo`, `CustoCargo`.
  - `CustoCargo` = custo mensal por cargo (salário + encargos + provisões), versionado por
    `competencia` (YYYY-MM). custo/hora = `custo_mensal / jornada_horas` (220). Referência usada
    por Frota (custo do motorista), Obras (mão de obra) e RH. Rota `/api/custos-cargo`;
    seed em `prisma/import-custos-cargo.ts` (Convenção 2025/26).
  - `Veiculo` = patrimônio da frota (placa, identificação, modelo, km_atual) + base de custo
    do estudo de frota: `fipe_codigo`, `valor_fipe`, `valor_aquisicao`, `valor_residual`,
    `vida_util_anos` (depreciação) e `consumo_kml` (custo de combustível por km). As transações
    de frota (viagens/abastecimentos/manutenções/custos fixos) ficam no JustFrota e referenciam
    este ID. Ver seção 8.
  - `Documento` = **ponteiro** de arquivo no storage + metadados + relação polimórfica
    (`entidade_tipo`+`entidade_id`, sem FK). É o **GED** da plataforma: classificação
    (`tipo_codigo`→`TipoDocumento`), `metadados` (JSON), versionamento (`grupo_id`/`versao`/
    `status`), validade (`valido_ate`) e flag `sensivel` (download mediado × link). Ver seção 12.
    Dois eixos universais de navegação são **colunas** (indexadas): **`natureza`**
    (`padrao` = modelo/SGQ controlado × `registro` = evidência preenchida — separação ISO 9001/
    PBQP-H cl. 7.5) e **`setor`** (qualidade | engenharia | rh | sst | suprimentos | …). Os
    demais campos do SGQ que só servem ao doc padrão (`processo`, `classificacao`, `codigo_doc`,
    `revisao`) ficam no JSON `metadados` (não incham a tabela). Docs padrão são globais:
    `entidade_tipo=empresa`.
  - `TipoDocumento` = catálogo controlado de tipos (ASO, projeto, alvará, IT, formulário…);
    define defaults de comportamento (`natureza`, `setor`, sensível, versionável, vence,
    retenção, obrigatório) por `entidade_tipo`. Seed (51 tipos derivados da PGQ-Lista Mestra e
    do Mapa de Controle de Registros) em `prisma/import-tipos-documento.ts`. Vocabulário
    controlado (setores/processos/classificações) em `server/lib/ged-taxonomia.ts`.
  - `Obra` tem `cost_center` (centro de custo), empresa, status.
  - `Insumo` = catálogo de EPIs (com C.A.), materiais, ferramentas, equipamentos.
  - `Alocacao` = colaborador × obra × período (papel, principal, responsável).
  - `BiometriaDigital` = templates de digital do colaborador (cadastro é no Core).
- `server/index.ts` — Express:4100. Gera **CRUD REST genérico** por entidade via
  `relationize()` (converte FK escalar `xxx_id` em `{ xxx: { connect: { id } } }`, exigência
  do Prisma 7). Rotas: `GET/POST/PUT/DELETE /api/<entidade>` + `/api/health` +
  `/api/biometria/...` (templates do colaborador).
- `server/lib/biometria.ts` — `extractTemplate`, fala com o serviço .NET (4002).
- `server/documentos.ts` — **GED**: rotas `/api/documentos` (upload multipart via **multer**
  com `tipo_codigo`/`natureza`/`setor`/`processo`/`classificacao`/`codigo_doc`/`revisao`/
  `metadados`/`valido_ate`/`substitui_id`; lista com filtros
  `?tipo_codigo=&natureza=&setor=&status=&vigente=true`; `/:id`; `/:id/versoes`;
  **`/:id/download` mediado**; delete). `/api/ged/taxonomia` = vocabulário controlado
  (natureza/setor/processo/classificação). `/api/tipos-documento` = CRUD do catálogo.
  `server/lib/storage/` — abstração de
  storage: `LocalDiskStorage` (dev, pasta `storage/`) e `SharePointStorage` (Graph),
  escolhidos por `STORAGE_DRIVER`. Ver seção 12.
- UI admin (`src/`): tela única dirigida por **`src/entities.tsx`** (metadados de cada
  entidade) + `components/EntityAdmin.tsx` / `EntityForm.tsx` / `RefSelect.tsx` (selects de
  relação populados do próprio Core). `views/BiometriaView.tsx` para cadastro de digital.

## 5. JustEleva — desempenho

- `app/server/index.ts` (Express:3001) + **`server/routes/`** (um arquivo por domínio):
  `alocacoes, calibrations, cycles, employees, evaluations, feedback, indicadores,
  movimentacoes, obras, pdi, portal, surveys, templates`.
- `app/src/views/` (uma tela por arquivo): Dashboard, Central, EvaluationForm/List,
  EvaluatorPortal, Calibration, CycleManagement, EmployeeProfile, Feedback, Movimentacao,
  Obras, PDI/PDIDetail, Reports, Settings, Survey/SurveyResponse, Team, Indicadores.
- `app/scripts/sync-from-core.ts` — **importa cadastros do Core** (colaboradores/obras).
- Tem seu próprio `docs/resumo-projeto.md` e `AGENTS.md` com convenções detalhadas e skills.
- **Padrões (de AGENTS.md)**: nova rota → arquivo em `server/routes/` + registra em
  `server/index.ts` + hook em `src/hooks/`. Nova view → `src/views/` + case em `App.tsx` +
  item no `Sidebar.tsx`.

## 6. JustSecurity — segurança do trabalho

- `server/db.ts` — SQLite (`data/justsecurity.db`) **direto com better-sqlite3** (não
  usa Prisma). Schema + seed locais. Guarda só **entregas** e **fichas**; colaboradores e
  EPIs vêm do Core.
- `server/index.ts` (Express:4001). Rotas: `/api/entregas` (+ `/verificacao`),
  `/api/fichas` (+ `/resumo`, `/:id`, `/:id/historico`, `/:id/inspecoes`, `/:id/baixa`),
  `/api/biometria/health|verify`. Colaboradores/EPIs **não** têm rota aqui — a UI consome
  `/core/api/...` via **proxy do Vite** (`vite.config.ts`: `/core` → `http://localhost:4100`).
- `server/biometria.ts` — match **1:N**: busca templates do colaborador no Core
  (`CORE_URL`, default `127.0.0.1:4100`) e chama o serviço .NET (`BIOMETRIA_URL`, default
  `127.0.0.1:4002`) `/match`. `MATCH_THRESHOLD` default **40** (~FMR 0,01%), via env.
- `server/ciclo.ts` — ciclo de vida do EPI (status). `src/lib/status.ts` — derivação de status.
- `src/views/`: `EntregaEpiView` (registrar entrega + assinatura), `HistoricoView`,
  `FichasView`, `RelatorioView`. `src/components/`: `FingerprintCapture`, `TermoEntrega`
  (termo jurídico), `BaixaModal`, `InspecaoModal`, `TrocaModal`.

### Como a digital funciona (importante)

- **Identificação 1:N**: a digital diz *qual colaborador* é (valor jurídico do termo).
- **Captura** (cliente): `Página → @digitalpersona/websdk (window.WebSdk) → agente local
  DigitalPersona → leitor U.are.U 4500`. O navegador **não** acessa o USB direto.
- `src/lib/fingerprint.ts` + `components/FingerprintCapture.tsx`: tenta o agente local; se
  não houver (timeout ~4s) **cai em modo simulado** (testa o fluxo). Troca pra digital real
  automaticamente quando o agente for instalado — sem mexer no código. `websdk-stub.ts` =
  stub do WebSdk; alias no `vite.config.ts`.
- **Match** (servidor): serviço .NET SourceAFIS na 4002.
- **Pendência conhecida**: falta instalar o **DigitalPersona Lite Client / WebSDK runtime**
  nesta máquina (driver WBF do leitor já está OK; WBF/Windows Hello não entrega a imagem a
  páginas web, por isso o Lite Client é necessário).

## 7. JustGate — gateway WhatsApp (Meta Cloud API)

- Serviço **Node/Express** (porta **4200**, `JustGate/`). **Sem cadastro próprio** — consulta
  o **Core (4100)** para identificar o remetente pelo telefone.
- `server/index.ts` — webhook: `GET /webhook` (verificação, devolve `hub.challenge` se o
  `WA_VERIFY_TOKEN` bater) e `POST /webhook` (recebe, **ACK 200 imediato** e processa depois).
  `GET /health` (status). **`GET /` = painel** (status + simulador de mensagem + últimas
  recebidas); **`POST /simular`** roteia uma mensagem sem enviar nada (usado pelo painel).
  `GET /privacy` e `/terms` (páginas exigidas pela Meta, provisórias).
- `server/core.ts` — `identifyByPhone` casa o número (E.164) com `colaboradores` do Core pelos
  **últimos 8 dígitos**. `server/router.ts` — roteamento por intenção (esqueleto: texto-chave
  + tipo de mídia → JustAtestados/JustAccess/GED). `server/whatsapp.ts` — envio + download de
  mídia; **modo simulado** (loga no console) quando sem `WA_TOKEN`.
- Decisões/uso (ver skill `justgate-whatsapp` e `JustGate/README.md`): **Meta Cloud API**
  oficial; testar com o **número de teste da Meta** (registrar um número o torna API-only);
  webhook local via **túnel** (cloudflared/ngrok); janela de 24h × template; mídia recebida →
  arquivar no **GED** (`POST /api/documentos`). Segredos só no `.env`/VPS.

## 8. JustFrota — gestão de frota

- Serviço **Node/Express + Prisma 7/SQLite** (back **4300**, front **4301**, `JustFrota/`),
  mesmo padrão do Core. **Sem cadastro próprio** — veículo/motorista/obra vêm do Core; guarda
  só transações.
- `prisma/schema.prisma` — **`Viagem`** (diário de bordo: km inicial/final, `km_rodado`
  derivado e validado, origem `manual|importacao|whatsapp`), **`Abastecimento`**,
  **`Manutencao`**, **`CustoFixo`** (competência YYYY-MM). Snapshot do nome + ID do Core.
- `server/index.ts` — CRUD `/api/viagens` + CRUD `/api/abastecimentos|manutencoes|custos-fixos`
  + `GET /api/custos/resumo` + **`GET /api/rateio`** (rateio **por km rodado**;
  `?inicio=&fim=&veiculo_id=&custo=` — sem `custo`, soma os custos lançados no período; devolve
  km, %, custo alocado por obra e memória de cálculo)
  + **`POST /api/depreciacao/gerar?competencia=YYYY-MM[&veiculo_id=]`** (gera/atualiza o
  `CustoFixo` tipo `depreciacao` do mês a partir do patrimônio do Core:
  `(valor_aquisicao − valor_residual) / (vida_util_anos × 12)`; idempotente; pula veículo sem
  esses dados — não fabrica custo)
  + **`GET /api/custos/por-veiculo?inicio=&fim=`** (dashboard de **custo por veículo** no período:
  combustível + manutenção + depreciação + outros fixos + **motorista** → custo total e custo/km.
  O custo do motorista vem do `CustoCargo` do Core × meses, rateado pela fração de km que cada
  motorista rodou no veículo). Lê cadastros do Core por HTTP (`CORE_URL`, default 4100).
- **Front** (`src/`, Vite/React/Tailwind v4/React Query, proxy `/api`→4300 e `/core`→4100):
  abas **Diário** (form com selects do Core + validação de km / lista), **Custos**
  (abastecimento/manutenção/fixo), **Custo/veículo** (dashboard por veículo + botão "gerar
  depreciação do mês") e **Rateio** (período + custo → tabela por obra).
- `prisma/import-diario.ts` — **importa o CSV do diário** (`npm run import [csv]`): limpa
  km/datas, calcula `km_rodado` (descarta salto inconsistente), casa veículo/obra/motorista
  com o Core, relata anomalias. **Base real importada** (abr–jun/2026, 220 viagens): rateio de
  km por obra de maio/junho já fecha; falta lançar custos (e base salarial) p/ virar R$.
- **Decisões**: rateio só por **km**; escopo só **veículos**. Próximos: lançar viagem pelo
  **WhatsApp (JustGate)**; custo por obra → Sienge (`cost_center`) e BI. Ver skill `frota-gestao`.

## 9. Rodar

```bash
# por app:
cd <app>            # JustCore | JustEleva/app | JustSecurity
npm install
npm run db:migrate && npm run db:seed   # Core/Eleva (Prisma); Security semeia no db.ts
npm run dev                              # sobe front + back (Core também sobe a biometria .NET)
```

JustCore `dev` = `concurrently`: biometria (.NET, `dotnet run`) + server (4100) + vite (4101).
**Suba o JustCore primeiro.**

> **Gotcha (Core/Prisma 7):** após `prisma migrate dev`, rode **`npx prisma generate`**
> explicitamente — neste setup (driver adapter + `prisma.config.ts`) o migrate **não**
> regenera o client, e o `db.<modelo>` novo vem `undefined` até gerar.

## 10. Dados sensíveis / versionamento

Planilhas com dados pessoais (CPF, RG, PIS, endereços) e os **bancos SQLite não são
versionados** (`.gitignore`). Cadastros recriados via seed/migration e pelos importadores
em `JustCore/prisma/` (`import-*.ts`). Chaves/segredos nunca no front.

## 11. Hospedagem / deploy (decisão de infra)

- **Hospedagem compartilhada (ex.: HostGator plano M) NÃO serve.** Motivos: não roda Node
  persistente confiável, não roda **.NET** (mata a biometria 4002), não compila binários
  nativos (`better-sqlite3`). Forçar exigiria fundir os 3 Node em 1, migrar SQLite→MySQL e
  mover o match pra fora — degrada a arquitetura. **Inviável na prática.**
- **Caminho recomendado: VPS** (roda o código como está). Stack de deploy: Ubuntu + Node +
  **PM2** (um processo por backend Node) + **Nginx** (reverse proxy + serve o front buildado,
  1 subdomínio por app) + serviço .NET + HTTPS (Let's Encrypt). Em produção **não roda Vite**
  (build estático), então o footprint cai bem.
- **VPS sugerido**: Hostinger KVM 2 (DC no Brasil, paga em BRL) como melhor custo-benefício;
  alternativas com DC no BR: Vultr/AWS Lightsail (São Paulo); melhor preço fora do BR:
  Hetzner/Contabo. **Começar em 4 GB + swap 2–4 GB** e escalar sob demanda (upgrade de VPS é
  trivial, não muda arquitetura). Evitar 2 GB (o `build` estoura). HostGator: só a linha
  **VPS** (com root), não a compartilhada.
- **Deploy zero-custo (em andamento): Render + Neon + SharePoint.** Decisão de infra para
  hospedar sem custo (alternativa ao VPS pago acima):
  - **Front-ends** (todos os Vite/React) → **build estático** em **Render Static Sites**
    (grátis, sem spin-down, sem limite de horas). *Pendente (Fase 3b):* cada front fala com 2
    backends (o próprio `/api` + o Core `/core`) por caminho relativo (proxy do Vite em dev); como
    static site em outra origem isso não resolve, e o Render **não** faz proxy de static site →
    backend externo. Solução: **base de API configurável no build** por front (`VITE_*`) apontando
    para os paths do gateway (Security: `/api`→`/security`, `/core`→`/core`; etc.). O `JustHub`
    (`src/modules.ts`) precisa trocar os `url`/`healthUrl` `localhost` pelas URLs do Render.
  - **Manifesto `render.yaml`** (raiz): Fase 3a entrega o **web service do gateway** (build instala
    os 6 apps + `prisma generate`, start = `gateway`; segredos via `sync:false` no painel). Static
    sites dos fronts entram na Fase 3b.
  - **Backends Node** → **consolidados num único Render Web Service** (free tier tem ~750h/mês
    compartilhadas e spin-down após 15 min; 6 serviços separados não cabem). **Implementado em
    `gateway/`** (Fase 2): NÃO dá pra montar os 6 Express como routers num só processo porque
    cada app tem o seu **Prisma Client** gerado sob o mesmo nome `@prisma/client` (colidem). Em
    vez disso, o `gateway/index.ts` sobe os 6 backends como **processos-filhos** em portas
    internas fixas (Core 4100, Eleva 3001, Security 4001, Train 4600, Frota 4300, Gate 4200) e
    roda um **proxy reverso** (http-proxy-middleware) no `$PORT` roteando por path
    (`/core`,`/eleva`,…; o prefixo é removido). Cada app mantém seu node_modules/Prisma Client.
    Apps que lêem `process.env.PORT` (Eleva/Frota/Gate) recebem a porta interna explícita do
    gateway. Chamadas **entre apps** continuam diretas (`127.0.0.1:4100`), sem passar pelo proxy.
    Cada backend ganhou script **`start`** (`tsx server/index.ts`, sem watch/vite/biometria).
    *Risco do free tier: 6 processos + proxy em 512 MB — apertado; fallback = instância paga
    (US$7/mês).*
  - **Banco** → **Neon Postgres** (free tier **persistente** — não usar o Postgres do próprio
    Render, que é apagado em ~30 dias). Cada app = um database no mesmo projeto Neon.
  - **Arquivos** → **SharePoint/Graph** (já implementado; M365 da empresa).
  - **Biometria** → `.NET` + leitor HID ficam no **totem Windows local** (LAN); a nuvem só
    guarda templates (free tier derrubaria o match com cold-start).
- **Port SQLite → PostgreSQL (concluído no código):** **toda** a plataforma usa **Prisma** com
  provider `postgresql` + adapter `@prisma/adapter-pg` (driver `pg`). Os 5 apps com dados
  (Core/Eleva/Security/Train/Frota) tiveram `provider` trocado, `prisma.config.ts`/client lendo
  `DATABASE_URL`, e **baseline única `prisma/migrations/0_init` regerada para Postgres** (offline
  via `prisma migrate diff`, `migration_lock.toml` = postgresql). Security mantém o legado (`id`
  SERIAL/datas TEXT; **cadeia de hash da entrega assinada intacta**). `JustEleva/app/server/db.ts`
  (código morto) já fora removido. **Projeto Neon `plataforma-just` (região sa-east-1) criado**,
  com 5 bancos (`justcore`/`justeleva`/`justsecurity`/`justtrain`/`justfrota`); `migrate deploy`
  rodado em todos (usar a conexão **direta** — sem `-pooler` — no migrate, pois o pooler/PgBouncer
  não suporta os advisory locks; **pooled** no runtime). **Dados SQLite→Postgres copiados e
  validados** (Core 599 / Eleva 571 / Train 310 / Frota 223 / Security 6 linhas; contagens batem,
  cadeia de hash do Security íntegra, sequences SERIAL resetadas) via copiador genérico dirigido
  pelo DMMF (coage Boolean 0/1→bool e DateTime ISO→Date, ordem por FK com retry, idempotente).
  **Toda demanda de dados passa pela skill `banco-dados`.**
- **Biometria no mobile**: HID 4500 + WebSDK **não** roda em celular/tablet (é Windows).
  Caminhos: (a) manter um desktop/notebook Windows como "totem" com o leitor — sem reescrever;
  (b) leitor com **SDK Android** + app nativo enviando template ao VPS p/ SourceAFIS (projeto
  à parte); (c) biometria nativa do celular via WebAuthn = só 1:1 atrelado ao device, **perde**
  a identificação 1:N (fraco juridicamente).

## 12. Armazenamento de arquivos (SharePoint + Microsoft Graph)

**Decisão de arquitetura.** Banco no **VPS**; arquivos pesados (ASO, atestados, certificados
de treinamento, fotos/vídeos de obra, evidências de FVS, termos de EPI) no **SharePoint /
M365** que a empresa já paga.

> **Status:** **GED** implementado no **JustCore** (catálogo `TipoDocumento` + `Documento`
> com classificação/metadados/versionamento/validade + rotas + abstração de storage). Driver
> `local` (dev) e driver **`sharepoint` (Graph) FUNCIONANDO e testado em produção real**
> (upload no site `PlataformaJust`, binário com hash idêntico, download mediado, sensível sem
> link, delete). Core lê `.env` via `dotenv`. Detalhes/credenciais em
> `docs/integracao-sharepoint.md`. Trocar driver por `STORAGE_DRIVER` no `.env`.

O GED é genérico e do Core: qualquer app anexa/consulta documento de colaborador, obra,
projeto, etc. por uma só API. A **UI do GED é o app `JustDocs` (4400)** — front-only que
consome `/api/documentos`, `/api/ged/taxonomia`, `/api/tipos-documento` e os cadastros do Core.
Telas: **Pastas** (`PastasView` — navegação tipo SharePoint com breadcrumb, derivada da
taxonomia: 4 raízes **SGQ** [docs padrão por processo→classificação], **Obras** [por obra→setor],
**Pessoas** [por colaborador] e **Empresa** [setores globais] — a "pasta" é visão, não caminho),
**Documentos** (upload/versão/download) e **Vencimentos**. Catálogo de tipos semeado por
`JustCore/prisma/import-tipos-documento.ts` e editável na tela do Core. Evolução prevista
(ver skill `ged-documentos`): acesso por perfil + trilha de auditoria (depende de auth no
Core), alerta de vencimento (via JustGate/WhatsApp), busca full-text (Graph).

### Regra de ouro

> **O SharePoint guarda os bytes. O banco guarda o *ponteiro* + metadados + a relação de
> negócio.** A verdade sobre "qual arquivo é de quem, de quando, quem pode ver" está sempre
> no banco — coerente com "JustCore é a fonte única". O SharePoint é só disco barato/grande.

### Onde mora: tabela `Documento` no **JustCore** (centralizada)

ASO/treinamento são da *pessoa* (cadastro do Core) e servem a vários módulos; centralizar
evita reimplementar a integração Graph em cada app e mantém **uma só credencial** do
SharePoint. Apps anexam arquivo chamando o Core (`/api/documentos`).

```
Documento
  id              uuid
  entidade_tipo   colaborador | obra | treinamento | entrega_epi | fvs ...
  entidade_id     -> cadastro/transação relacionado
  categoria       aso | atestado | certificado_treinamento | foto_obra | termo_epi ...
  nome_original   string
  sp_drive_id     ┐  identificadores do Microsoft Graph — o ponteiro real
  sp_item_id      ┘  (sobrevive a renomear/mover no SharePoint)
  sp_web_url      link para abrir (usado só em arquivo NÃO sensível)
  sensivel        bool   (ASO/atestado/CID/biometria = true; foto de obra = false)
  content_type, tamanho, hash
  uploaded_by, created_at, retido_ate
```

### Abstração de storage (dev no localhost / prod no SharePoint)

Mesmo espírito do `dataService`: uma interface, dois drivers escolhidos por env var.

```
interface StorageService {
  upload(categoria, ref, file) -> { id, url }
  getStream(id)   // download mediado pelo back-end
  delete(id)
}
```

| Driver | `STORAGE_DRIVER` | Quando | O que faz |
|---|---|---|---|
| `LocalDiskStorage` | `local` | dev / localhost | salva em `storage/` (gitignored), devolve URL local — não exige M365 |
| `SharePointStorage` | `sharepoint` | VPS / produção | Microsoft Graph → sobe no SharePoint |

Telas e rotas não mudam ao trocar de driver. O arquivo **nunca** fica no VPS em produção.

### Acesso ao Graph

- **App registration no Azure AD**, permissão **`Sites.Selected`** (escopo a 1 site só —
  mínimo privilégio, não `Sites.ReadWrite.All`). Fluxo **client-credentials** (servidor↔
  servidor, sem login por usuário). Segredo no `.env` do VPS, **nunca no front**.
- Taxonomia de pastas é só para humano navegar direto no SharePoint (o app usa `sp_item_id`):
  `/Plataforma JUST/Colaboradores/{id}/ASO/2026/…`,
  `/Plataforma JUST/Colaboradores/{id}/Treinamentos/{NR-xx}/…`,
  `/Plataforma JUST/Obras/{cost_center}/Fotos/2026-06/…`.

### Corte de LGPD (ver skill `lgpd-compliance`)

- **Sensível** (ASO, atestado, CID): o front **nunca** recebe a URL do SharePoint. Download
  via `GET /api/documentos/:id/download` → back-end **checa perfil + loga acesso** → faz
  stream do Graph. Política de retenção via `retido_ate`.
- **Não sensível** (foto de obra): pode usar `sp_web_url`/link direto (mais leve).
