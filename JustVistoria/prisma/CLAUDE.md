# prisma — schema de transações do JustVistoria (Postgres)

`schema.prisma` define só os modelos deste app; cadastro (Cliente/Unidade/Obra) é do Core e entra
aqui como snapshot (`unidade_id`/`unidade_label`, `obra_id`). Modelos: `CronogramaTarefa` (linha
de base importada do Prevision — pacote/local/datas, origem das pendências de Construção);
`EtapaUnidade` + `ItemEtapa` (pipeline por unidade: construcao→inspecao_final→vistoria_cliente→
entrega_chaves, com agendamento/situação); `FormularioModelo` + `FormularioInstancia` (motor de
formulários local — template versionado + preenchimento, candidato a migrar para o Core quando o
motor transversal absorver este app); `NaoConformidade` (registro único de NC/pendência, com
`severidade`, `origem`, `categoria`/`equipe` para distribuição, `causa_raiz`/`acoes` para
tratativa de crítica); `Termo` (assinatura em tela + hash SHA-256 + ponteiro pro GED).

`seed.ts` semeia o modelo FVC; `import-prevision.ts` importa cronograma (CSV/API) e cria
obra+unidades no Core. **Não detalhe `migrations/`** — são geradas, não editar à mão.

Qualquer alteração de schema aqui: usar a skill `banco-dados` e, se mudar contrato entre apps,
atualizar `docs/resumo-projeto.md` seção 13.
