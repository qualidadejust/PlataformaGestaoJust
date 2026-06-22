# Agentes / Skills especialistas — plano da Plataforma JUST

Como a plataforma cresce por módulos, cada **área de negócio** ganha uma **skill de
domínio** (conhecimento + critérios de qualidade), invocável com `/nome`, que carrega a
regra do setor sem poluir o contexto principal. Skills **técnicas** e o subagente `Explore`
cuidam de código/execução. Este documento é o mapa do que já existe e do que vale criar.

## Padrão de skill de domínio (modelo a seguir)

Espelhar o formato de `JustEleva/.claude/skills/indicadores-dados/SKILL.md`:
frontmatter (`name`, `description` com "Use para…"), papel do especialista, princípios,
como entregar a análise, contexto do app, antipadrões. **Escopo por pasta**: skill que vale
para um app fica em `<app>/.claude/skills/`; skill transversal (LGPD, formulários) fica na
raiz `.claude/skills/`.

## Já existe — reutilizar

| Skill / agente | Área | Onde |
|---|---|---|
| `coachdesempenho`, `clima-organizacional`, `indicadores-dados` | RH / Desempenho | JustEleva |
| `ux-ui-design`, `ui-polish` | Design de telas | JustEleva |
| `frontend-just`, `backend-just` | Convenções de código | JustEleva |
| `qa-tester`, `code-review`, `verify`, `run`, `caveman`, `launch` | Qualidade técnica / execução | — |
| `Explore` (subagente) | Busca de código | nativo |

## Criadas ✅

### `sst-epi` — Segurança do Trabalho / EPI
NR-6 (EPI, C.A. válido), NR-18, ciclo de vida (inspeção/troca/baixa), valor jurídico do
termo assinado por digital (1:N), ficha de EPI, ASO/aptidão.
**Em:** `JustSecurity/.claude/skills/sst-epi/`.

### `qualidade-fvs` — Qualidade / PBQP-H
FVS/FVM, não conformidades, plano de ação, evidência fotográfica, rastreabilidade até a
unidade, motor de formulários versionado, indicadores de qualidade.
**Em:** `.claude/skills/qualidade-fvs/` (raiz — transversal).

### `lgpd-compliance` — Dados sensíveis / LGPD
Base legal por tipo de dado, minimização, retenção/descarte, acesso por perfil, trilha de
auditoria, armazenamento sensível mediado. Revisor transversal de schema/rotas/upload.
**Em:** `.claude/skills/lgpd-compliance/` (raiz — transversal).

### `ged-documentos` — GED / ECM (gestão eletrônica de documentos)
Tipos de documento, classificação, metadados, versionamento, vencimento/validade, retenção e
integração do repositório central (Core) com os apps. Espelha o GED implementado no Core
(`TipoDocumento` + `Documento` + `/api/documentos`).
**Em:** `.claude/skills/ged-documentos/` (raiz — transversal).

### `justgate-whatsapp` — Gateway WhatsApp
Webhook (verificação/recebimento), identificação do remetente pelo Core, roteamento por
intenção/permissão, envio (janela 24h × template), mídia → GED, custos. Espelha o serviço
`JustGate/` (Meta Cloud API).
**Em:** `JustGate/.claude/skills/justgate-whatsapp/`.

### `frota-gestao` — Gestão de frota / rateio
Diário de bordo, abastecimento, manutenção, custos fixos e **rateio de custos por km** entre
as obras. Espelha o app `JustFrota/` (Veiculo no Core + Viagem + `/api/rateio`).
**Em:** `.claude/skills/frota-gestao/` (raiz — transversal).

### `banco-dados` — Banco de dados / persistência (transversal, técnica)
Dono da camada de dados de **todos** os apps: modelar/alterar schema, migrations, índices,
relações, integridade, performance, **padronizar no Prisma (nunca SQL cru)**, portar
SQLite→PostgreSQL e decidir "onde mora o dado" (cadastro=Core × transação=app). Absorve a
ideia do subagente `core-schema-guardian` (impacto de mudanças no schema do Core).
**Acione em qualquer demanda de dados.** **Em:** `.claude/skills/banco-dados/` (raiz).

## Propostas — criar quando o módulo chegar

### `obras-diario` — Obras / Diário de obra
**Por quê:** Fase 3, porém é o coração da construtora; bom ter o domínio pronto.
**Cobre:** RDO/diário de obra, avanço físico × planejado, efetivo, clima, integração
Prevision (linha de base) e Sienge; centro de custo (`Obra.cost_center` já existe no Core).
**Local:** raiz `.claude/skills/obras-diario/`.

### 5. `atestados-absenteismo` — JustAtestados
**Por quê:** módulo previsto na Fase 1; fluxo WhatsApp → SharePoint → fila de análise.
**Cobre:** CID, ASO, cálculo de absenteísmo, tipos de afastamento, dado de saúde (sensível
→ liga em `lgpd-compliance`).
**Local:** `.claude/skills/atestados-absenteismo/` (quando o app nascer).

## Subagente técnico sugerido

- **`core-schema-guardian`** — como o JustCore é fonte única, mudanças no
  `prisma/schema.prisma` impactam todos os apps. Um subagente que, ao alterar o schema do
  Core, verifica consumidores (`sync-from-core`, proxies `/core`, snapshots de transação)
  e aponta o que precisa migrar. Pode ser uma skill em `JustCore/.claude/skills/`.

## Como decidir entre skill e subagente

- **Skill de domínio** = conhecimento + critérios (regra de negócio do setor). Invocada sob
  demanda, não custa contexto quando não usada. **Default para área de negócio.**
- **Subagente** (via Agent tool) = trabalho isolado e paralelizável (varrer telas, busca
  ampla, refator em massa). Use para economizar contexto em tarefas mecânicas/grandes.
