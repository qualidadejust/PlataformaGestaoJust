# Resumo do projeto — JustEleva (JustAvaliacoes)

> **Nome do produto: JustEleva** (gestão de desempenho da Construtora JUST). Aparece junto ao logo na Sidebar e no portal.

## Objetivo

Sistema interno da Construtora JUST para gerenciar ciclos de avaliação de desempenho por competências, PDI (Plano de Desenvolvimento Individual) e feedback contínuo entre colaboradores e gestores.

## Stack técnica

- **Frontend**: React 19 + Vite 6 + TypeScript + Tailwind CSS v4
- **Backend**: Express 4 em `server/` (tsx watch em dev, porta 3001)
- **Banco de dados**: SQLite via better-sqlite3, arquivo em `data/justavaliacoes.db`
- **Estado do servidor**: @tanstack/react-query v5 (cache, loading states, invalidação)
- **UI**: lucide-react para ícones, recharts para gráficos, motion para animações
- **Dev runner**: concurrently (npm run dev sobe frontend + backend juntos)

## Estrutura de pastas

```
app/
├── server/
│   ├── db.ts              # Conexão SQLite, schema DDL, seed inicial
│   ├── index.ts           # Express app, registro de rotas
│   └── routes/
│       ├── employees.ts   # CRUD colaboradores
│       ├── cycles.ts      # CRUD ciclos de avaliação
│       ├── evaluations.ts # CRUD avaliações + notas
│       ├── pdi.ts         # CRUD planos e ações PDI
│       └── feedback.ts    # CRUD feedback
├── src/
│   ├── hooks/             # React Query hooks (useEmployees, useEvaluations, usePdi, useCycles, useFeedback)
│   ├── views/             # Telas da aplicação
│   ├── components/        # Componentes compartilhados
│   ├── types.ts           # Tipos e constantes (competências, questões, escalas)
│   └── main.tsx           # Entrada React + QueryClientProvider
├── data/                  # SQLite gerado em runtime (gitignored)
├── docs/                  # Esta pasta
├── CLAUDE.md              # Importa AGENTS.md
└── AGENTS.md              # Diretrizes para IAs
```

## Schema do banco de dados

| Tabela | Descrição |
|---|---|
| `employees` | Colaboradores (nome, cargo, depto, e-mail, gestor flag, `cost_center`) |
| `obras` | Obras/centros (`nome`, `cost_center` único, `tipo`: obra/sede, `status`: ativa/encerrada) |
| `alocacoes` | Alocação colaborador × obra × período (`papel_na_obra`: residente/mestre/mao_de_obra/administrativo, `principal`, `responsavel`, datas) — suporta circulação entre obras; `responsavel` = quem avalia o nível abaixo na obra |
| `cycles` | Ciclos de avaliação (nome, datas, status, `tipo`: periodica/movimentacao) |
| `access_tokens` | Link mágico (sem senha) por avaliador, escopo ciclo **ou** movimentação → abre a fila no portal |
| `movimentacoes` | Avaliação de movimentação: `tipo` (aumento/promocao), cargo atual, `cargo_pretendido` opcional (no aumento = cargo atual), status, decisão. Banca = `evaluations` com `type='movimentacao'` |
| `indicadores` / `indicador_atribuicoes` | Catálogo de indicadores SMART (nome, `setor`, `formula`, `meta`, `unidade`, `direcao`, `periodicidade`, `responsavel`, `acumula`, cargo_alvo) e atribuição por pessoa (meta, peso, fonte). `acumula`=true → contagem com teto anual (acumula no ano, não rateia meta); false → taxa/% comparada por período. Semeado com os KPIs do PEJ (`prisma/seed-indicadores-pej.ts`). **PILOTO: ainda NÃO compõe a nota** |
| `indicador_realizacoes` | Lançamento do valor **realizado** por indicador e período (`periodo` 'YYYY-MM'/'YYYY-Tn'/'YYYY', `valor` texto + `valor_num`, `observacao`, `lancado_por`, `employee_id` opcional = valor do setor). Upsert manual por (indicador, employee, periodo) — NULL no índice único do SQLite é distinto. **PILOTO: registro/observação, fora da nota** |
| `employees` | inclui `template_id` → override individual de modelo de avaliação |
| `evaluations` | Avaliação por colaborador/ciclo/tipo/avaliador (`obra_id` contexto, `origem`: manual/auto) |
| `evaluation_scores` | Nota por questão de competência (**1-5** ou NS) |
| `potential_scores` | Nota de potencial (1-3) por questão |
| `pdi_plans` | Plano PDI por colaborador/ciclo |
| `pdi_actions` | Ações do PDI (titulo, prazo, status, tipo, competência) |
| `feedbacks` | Feedback entre colaboradores |
| `evaluation_templates` | Modelos de avaliação editáveis (nome, escala, `applies_to`: default/managers) |
| `evaluation_blocks` | Blocos de um modelo (título, ordem, `manager_only`) |
| `template_questions` | Perguntas de um bloco (texto, ordem, `answer_type`: scale/yesno/text) |
| `survey_forms` / `survey_dimensions` / `survey_questions` | Modelo da pesquisa de clima (dimensões + perguntas; kind scale/eNPS) |
| `survey_campaigns` | Rodadas da pesquisa (nome, revisão, status, `min_n`) |
| `survey_responses` / `survey_answers` | Respostas **anônimas** (sem employee_id) e suas notas |
| `survey_imported_results` | Agregados de rodadas históricas importadas (médias por questão/obra) |
| `survey_comments` / `survey_actions` | Comentários anônimos e plano de ação por dimensão |

### Modelos de avaliação (perguntas editáveis)

As perguntas do formulário **não são mais hardcoded** — vêm de `evaluation_templates`. Cada pergunta tem um **tipo de resposta** (`answer_type`): `scale` (1–5 + N/S), `yesno` (Sim/Não/N-S) ou `text` (resposta aberta). Só respostas `scale` numéricas entram na média (`avg_score`); `yesno`/`text` são registradas mas não pontuam. Resolução do modelo: se a avaliação for `type='movimentacao'` → modelo `applies_to='movimentacao'`; senão `employee.template_id` (override individual) → `applies_to='managers'` se liderança → `applies_to='default'`. Seed padrão (`prisma/seed.ts`, `npm run db:seed`) = 6 blocos / 24 perguntas em escala 1–5; template de prontidão da movimentação em `prisma/seed-movimentacao-template.ts`.

> **Banco real = `prisma/dev.db`**, gerenciado por **Prisma Migrate** (`prisma/migrations/`) + Prisma Client com adapter better-sqlite3 (`server/lib/prisma.ts`). O arquivo `server/db.ts` e `data/justavaliacoes.db` são **legados e não usados** pelo servidor. Para mudar o schema: editar `prisma/schema.prisma` → `npx prisma migrate dev` → `npx prisma generate`.

## API REST (porta 3001, proxiada em /api pelo Vite)

| Método | Rota | Descrição |
|---|---|---|
| GET/POST | `/api/employees` | Listar / criar colaboradores |
| GET/PUT/DELETE | `/api/employees/:id` | Detalhar / editar / excluir |
| GET/POST | `/api/obras` | Listar (com contagem por papel) / criar obras |
| GET/PUT/DELETE | `/api/obras/:id` | Detalhar (com alocações + colaborador) / editar / excluir |
| POST | `/api/obras/:id/alocacoes` | Alocar colaborador na obra (papel, principal) |
| PUT/DELETE | `/api/alocacoes/:id` | Editar papel/principal / remover alocação |
| GET/POST | `/api/cycles` | Listar / criar ciclos |
| POST | `/api/cycles/:id/generate` | Gera avaliações periódicas pela matriz de alocações (idempotente; retorna `{criadas, ja_existiam, avisos}`) |
| POST | `/api/cycles/:id/access-tokens` | Cria/recupera links mágicos por avaliador do ciclo (para disparo WhatsApp) |
| GET | `/api/portal/:token` | Portal do avaliador (sem login): avaliador + `titulo` (ciclo ou movimentação) + sua fila |
| GET/POST | `/api/movimentacoes` | Listar (com progresso da banca) / criar movimentação |
| GET/PUT/DELETE | `/api/movimentacoes/:id` | Detalhar (com banca) / registrar decisão / excluir |
| POST/DELETE | `/api/movimentacoes/:id/banca[/:evaluationId]` | Adicionar / remover avaliador da banca |
| POST | `/api/movimentacoes/:id/access-tokens` | Links mágicos da banca (disparo WhatsApp); marca `em_coleta` |
| GET/POST/PUT/DELETE | `/api/indicadores[/:id]` | Catálogo de indicadores |
| GET/POST/PUT/DELETE | `/api/indicadores/atribuicoes[/:aid]` | Atribuição de indicador a pessoa (filtro `?employee_id=`) |
| GET/POST/DELETE | `/api/indicadores/realizacoes[/:rid]` | Lançamento do realizado (filtros `?indicador_id=` `?periodo=`); POST faz upsert por (indicador, employee, periodo) |
| GET/POST | `/api/evaluations` | Listar (filtros `cycle_id`/`employee_id`/`status`/`obra_id`; devolve `obra_nome`) / criar (GET `/:id` inclui o `template` resolvido) |
| PUT | `/api/evaluations/:id/scores` | Salvar notas |
| GET/POST | `/api/templates` | Listar / criar modelos de avaliação |
| PUT/DELETE | `/api/templates/:id` | Editar (meta + blocos/perguntas) / excluir modelo |
| PUT | `/api/employees/:id/template` | Atribuir modelo individual a um colaborador |
| GET/POST/PUT/DELETE | `/api/surveys/forms` | Modelos de pesquisa de clima (dimensões/perguntas) |
| GET/POST/PUT | `/api/surveys/campaigns` | Rodadas da pesquisa |
| POST | `/api/surveys/campaigns/:id/responses` | Responder (anônimo, sem login) |
| POST | `/api/surveys/campaigns/:id/import` | Importar rodada histórica (médias por obra) |
| GET | `/api/surveys/campaigns/:id/results` | Resultados agregados (aplica N mínimo) |
| GET/POST/PUT/DELETE | `/api/surveys/.../actions` | Plano de ação da pesquisa |

### Módulo de Pesquisa de Clima (anônimo)

Telas `survey` (dashboard: heatmap dimensão × obra, Quadro Geral, eNPS, comentários, plano de ação) e `survey_respond` (coleta anônima sem login). Resultados só aparecem com grupo ≥ `min_n` (default 5) — regra aplicada **no backend** (`/results`), não só na UI. Escala 1–5; eNPS 0–10. Seed traz a rodada histórica Abril/2025 (Rev 06) importada dos PDFs.
| GET/POST | `/api/pdi` | Listar / criar PDI |
| POST | `/api/pdi/:id/actions` | Adicionar ação ao PDI |
| PUT | `/api/pdi/:id/actions/:actionId` | Atualizar ação |
| GET/POST | `/api/feedback` | Listar / criar feedback |

## Telas atuais (mockup — ainda com dados hardcoded)

- `dashboard` — Visão geral: métricas, gráficos de tendência, heatmap por depto
- `team` — Lista e busca de colaboradores
- `obras` — Obras & Alocação: quem trabalha em cada obra e em que papel (base da matriz de avaliação)
- `movimentacao` — Avaliação de movimentação (aumento/promoção): solicitação → banca (RH define) → disparo WhatsApp → decisão
- `indicadores` — 4 abas: **Catálogo** (por setor, SMART), **Por pessoa** (atribuição), **Lançar realizado** (por período, responsável do setor lança valor+observação; salva via upsert) e **Painel de Desempenho** (gráficos recharts: donut de resumo atende/abaixo/sem dado + card por KPI com barras realizado/período e `ReferenceLine` da meta; barras verdes/vermelhas por atende; KPIs `acumula` somam no ano). **Piloto, desligado da nota**
- **Portal do avaliador** (`/avaliar/<token>`, fora do shell, mobile-first, sem login) — fila "Minhas Avaliações" do mestre/residente via link mágico; reusa `EvaluationFormView`. Detectado em `App.tsx` por `window.location.pathname`.
- `employee_profile` — Perfil individual
- `evaluations` — Lista de avaliações por status
- `evaluation_form` — Formulário de notas por competências + potencial
- `feedback` — Enviar e visualizar feedbacks
- `pdi` — Lista de PDIs
- `pdi_detail` — Detalhe e edição de ações do PDI
- `calibration` — Calibração coletiva por departamento
- `reports` — Relatórios gerenciais: KPIs do ciclo, **filtro por obra**, painel "Desempenho por Obra" (progresso + nota média), avaliações por colaborador e distribuição de PDI
- `settings` — Configurações
- `cycles` — Gerenciamento de ciclos

## Padrões de código

- Componentes com estado, eventos ou React Query usam `useState`/`useQuery` normalmente (sem diretiva especial, é Vite não Next.js)
- Imports usam `@/*` mapeado para a raiz
- Rotas Express em `server/routes/*.ts`, registradas em `server/index.ts`
- Hooks React Query em `src/hooks/use*.ts`
- Cada nova tela: arquivo em `src/views/`, case em `App.tsx`, item em `Sidebar.tsx`
- Tema de marca: navy `#0e2148` (tokens `brand-50…950` em `src/index.css` via `@theme` do Tailwind v4). Primário de ação = `bg-brand-900` (hover `brand-800`); acentos em `brand-*`; semânticos preservados (emerald sucesso, amber atenção, rose/red erro/excluir)
- Logos oficiais em `public/logos/` (logo-just.png marinho, logo-just-white.png branco, favicon-just.png tile). Componente `src/components/Logo.tsx` com fallback de texto
- CSS utilitário Tailwind; sem CSS Modules (diferente do projeto Atestados)

## Próximos passos técnicos

- **Matriz de avaliação por obra** (passo 2a — FEITO): `POST /api/cycles/:id/generate` gera as avaliações periódicas das alocações (mão de obra ← mestre `responsavel`; mestres ← residente `responsavel`; residente ← Diretor). Botão "Gerar avaliações" no ciclo ativo. Marcação de responsável na tela Obras (ícone escudo). Avaliação complementar p/ quem circula entre obras = futuro.
- **Disparo ao avaliador** (passo 2b/2c — FEITO): link mágico (`/avaliar/<token>`, sem senha) + portal "Minhas Avaliações" mobile (`EvaluatorPortal`); botão "Disparar (WhatsApp)" no ciclo gera os links e monta a mensagem `wa.me` pronta (MVP sem custo). Falta: lembretes automáticos (D-7/D-2) e automação de envio via API oficial.
- **Avaliação de movimentação** (passo 3 — FEITO): tela `movimentacao` + `Movimentacao` model. Fluxo solicitada → banca (RH adiciona avaliadores) → disparo WhatsApp (tokens escopo movimentação, portal reusa `EvaluationFormView`) → decisão (aprovada/reprovada + justificativa). Usa **template dedicado de prontidão** (`applies_to='movimentacao'`, seed em `prisma/seed-movimentacao-template.ts`): GET `/api/evaluations/:id` resolve por `type==='movimentacao'`; o form esconde Eixo de Potencial/PDI nesse caso.
- **Acompanhamento por avaliador** (FEITO): modal "Disparo & Acompanhamento" em Gestão de Ciclos com progresso por avaliador (concluído/em andamento/não iniciou) + botão Atualizar.
- **Lembretes automáticos** (D-7/D-2): pendente — depende de disparo agendado.
- **Indicadores na nota** (ligar o piloto): coletar o realizado no eixo da avaliação, calcular score (realizado vs meta → 1–5) e compor a nota com peso. Hoje o módulo `indicadores` só cataloga e atribui (desligado).
- Conectar views às APIs (substituir arrays hardcoded por hooks React Query)
- Implementar tela de login com autenticação básica
- Adicionar paginação/filtros na listagem de avaliações
- Relatórios: exportação CSV
