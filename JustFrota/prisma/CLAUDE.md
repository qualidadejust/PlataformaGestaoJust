# prisma/ — schema das transações de frota

`schema.prisma` (provider `postgresql`) define os 4 modelos de transação do app: **`Viagem`**
(diário de bordo — km inicial/final, `km_rodado` derivado e validado contra salto inconsistente,
`origem` manual|importacao|whatsapp), **`Abastecimento`** (combustível), **`Manutencao`**
(preventiva/corretiva) e **`CustoFixo`** (IPVA/seguro/licenciamento/depreciação, por
`competencia` YYYY-MM). Todos guardam `veiculo_id`/`nome` (e Viagem também `motorista_id`/
`obra_id`) como referência + snapshot do Core — nunca duplicam o cadastro.

`import-diario.ts` — importador do CSV do diário de bordo (`npm run import [csv]`): limpa
km/datas, calcula `km_rodado` descartando saltos inconsistentes, casa veículo/obra/motorista
com o Core e relata anomalias. `normalizar-core.ts` — script de normalização/casamento com
cadastros do Core.

Ver `docs/resumo-projeto.md` seção 8 para o schema completo e o histórico da importação.
