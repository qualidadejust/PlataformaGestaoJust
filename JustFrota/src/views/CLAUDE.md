# src/views/ — telas do JustFrota (uma aba por arquivo)

`DiarioView.tsx` — diário de bordo: formulário de viagem (selects de veículo/motorista/obra
populados do Core) com validação de km, e listagem/filtro das viagens lançadas.

`CustosView.tsx` — lançamento e listagem de abastecimento, manutenção e custo fixo.

`CustoVeiculoView.tsx` — dashboard de custo por veículo no período (combustível + manutenção +
depreciação + motorista, total e por km); botão "gerar depreciação do mês" (chama
`POST /api/depreciacao/gerar`).

`RateioView.tsx` — escolhe período (e opcionalmente custo/veículo) e mostra a tabela de rateio
por obra (km, %, custo alocado) vinda de `GET /api/rateio`.

Todas consomem `src/lib/api.ts`; nunca acessam Prisma/Core diretamente da view.

Ver `docs/resumo-projeto.md` seção 8.
