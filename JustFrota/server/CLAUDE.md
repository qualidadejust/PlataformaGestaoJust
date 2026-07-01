# server/ — API da frota (Express :4300)

`index.ts` é o coração do backend: CRUD REST de `/api/viagens`, `/api/abastecimentos`,
`/api/manutencoes` e `/api/custos-fixos`, mais `GET /api/custos/resumo`. Concentra também as
três regras de negócio do módulo: **`GET /api/rateio`** (rateio de custo entre obras por km
rodado no período, com memória de cálculo), **`POST /api/depreciacao/gerar`** (gera/atualiza o
`CustoFixo` tipo `depreciacao` do mês a partir do patrimônio do Core — idempotente, pula
veículo sem dado de depreciação) e **`GET /api/custos/por-veiculo`** (dashboard combustível +
manutenção + depreciação + motorista, com custo total e custo/km).

`core.ts` — cliente HTTP para o JustCore (`CORE_URL`, default `127.0.0.1:4100`): busca
veículos, obras e colaboradores para popular selects e casar nomes na importação/relatórios.
Nunca duplica esses cadastros localmente.

Ver `docs/resumo-projeto.md` seção 8 para as regras de rateio/depreciação/custo por veículo.
