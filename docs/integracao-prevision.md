# Integração com o Prevision (cronograma / linha de base)

O **Prevision** é o sistema de planejamento (cronograma físico) da obra. O **JustVistoria**
consome a **linha de base** dele para obter **locais** (pavimentos/unidades), **pacotes/
serviços** e **prazos** — e, em especial, o marco **`CHE - CHECK LIST FINAL`** por pavimento,
que define quando a unidade fica **pronta para a Inspeção Final**.

## Arquitetura: fonte trocável (`FonteCronograma`)

`JustVistoria/server/lib/cronograma.ts` define uma interface única:

```ts
interface FonteCronograma { nome: string; listar(): Promise<TarefaNorm[]> }
```

- **`CsvFonte`** (hoje): lê o CSV exportado do Prevision, conserta mojibake (UTF-8↔Latin-1),
  normaliza serviço→pacote, casa unidades vendáveis (`PER - UNIDADE NNN`) e datas.
- **`PrevisionApiFonte`** (futuro): mesma interface, puxando da **API** do Prevision. Quando
  houver endpoint/credenciais, implementar `listar()` (autentica → baixa tarefas do projeto →
  normaliza para `TarefaNorm`). **O importador e o app não mudam** — só troca a fonte.

Outras origens (MS Project, Sienge, planilha) entram do mesmo jeito: nova classe que
implementa `FonteCronograma`.

## Importador

`JustVistoria/prisma/import-prevision.ts` (idempotente):

```bash
npm run import -- "C:/caminho/cronograma_blank-residence-by-just.csv"
# env opcionais: OBRA_NOME (default "Blank Residence"), PREVISION_CSV, CORE_URL, INTERNAL_TOKEN
```

1. Garante a **obra** no Core (acha por nome ou cria).
2. Cria as **unidades vendáveis** no Core (roster das tarefas `PER - UNIDADE NNN`), idempotente.
3. Grava as tarefas em **`CronogramaTarefa`** (app), vinculando `unidade_id` quando a tarefa é
   da unidade; tarefas por pavimento ficam com `local` = "Nº ANDAR".

A etapa **Construção** e suas **pendências** são derivadas daí: o app casa as tarefas pela
coluna `local` (pavimento da unidade) **ou** `unidade_id`.

## Mapa de colunas do CSV

`id, service, job, floor, critical_path, start_date, end_date, predecessors, successors`

| Coluna | Vira | Observação |
|---|---|---|
| `service` | `servico` + `pacote` (prefixo) | "ALV- ALVENARIA…" → pacote `ALV` |
| `job` | `job` (sub-etapa) | "Chapisco", "Emboço"… |
| `floor` | `local` | pavimento/área; `PERSONALIZAÇÕES N` traz as unidades |
| `start_date`/`end_date` | `inicio`/`fim` | ISO `YYYY-MM-DD` |
| `critical_path` | `critico` | "Crítica" → true |
| `service` (`UNIDADE NNN`) | `unidade_numero`/`pavimento` | roster de apartamentos |

## Evolução prevista

- Implementar `PrevisionApiFonte` (sincronização automática, sem CSV manual) — meta de
  **automatizar a entrada de dados** (Prevision e outras fontes).
- Atualização incremental (re-import idempotente já suportado por `prevision_id` único).
- Repassar o avanço físico (% por pavimento) para enriquecer o status da Construção.
