# JustFrota — gestão de frota da Plataforma JUST

Serviço Node/Express + Prisma/SQLite (porta **4300**). Guarda só transações de frota
(viagens; depois abastecimentos/manutenções/custos) e referencia os cadastros do **Core**
(veículo, motorista=colaborador, obra). Rateio de custos **por km rodado** entre as obras.
Ver skill `frota-gestao` e seção 8 de `docs/resumo-projeto.md`.

## Rodar (dev)

```bash
cd JustFrota
npm install
npm run db:migrate && npm run db:generate
npm run dev            # back 4300 + front http://localhost:4301  (suba o JustCore 4100 antes)
```

> Gotcha (igual ao Core): depois de `prisma migrate dev`, rode `npm run db:generate` —
> neste setup o migrate não regenera o client.

## Importar o diário de bordo atual (CSV)

```bash
# coloque o DiarioBordo.csv na pasta JustFrota/ (gitignored) e:
npm run import                 # ou: npm run import caminho/para/arquivo.csv
```

O importador limpa km/datas, calcula `km_rodado` (descarta salto inconsistente — ex.: km
digitado errado), casa veículo/obra/motorista com o Core quando existirem, guarda snapshot do
nome e relata anomalias e itens não cadastrados.

Para **re-normalizar** viagens já importadas contra o Core (ex.: depois de cadastrar os
veículos), rode `npx tsx prisma/normalizar-core.ts` — regrava veiculo_id/obra_id/motorista_id
e o nome canônico do Core (regra: variantes "Michel*" = Michelangelo). Não mexe em km/datas.

## Endpoints

- `GET /api/health`
- `GET /api/viagens` (filtros `?veiculo_id=&obra_id=&motorista_id=&inicio=&fim=`) · `GET /:id`
  · `POST` · `PUT /:id` · `DELETE /:id`
- `GET/POST/PUT/DELETE /api/abastecimentos` · `/api/manutencoes` · `/api/custos-fixos`
- `GET /api/custos/resumo?inicio=&fim=&veiculo_id=` — totais de combustível/manutenção/fixo.
- **`GET /api/rateio?inicio=&fim=&veiculo_id=&custo=`** — rateio por km rodado entre as obras.
  Sem `custo`, usa a **soma dos custos lançados** no período; com `custo`, sobrepõe com o valor
  informado. Devolve km, %, custo alocado por obra + memória de cálculo (`custo × km / km_total`).

## Front (porta 4301)

Vite/React/Tailwind v4/React Query. Abas: **Diário** (form com selects do Core + validação de
km e lista), **Custos** (abastecimento/manutenção/fixo) e **Rateio** (período + custo → tabela
por obra, com atalhos Maio/Junho).

## Próximos passos

- **Base salarial por cargo** → custo de motorista/hora por obra (a entrar).
- **WhatsApp**: lançar viagem pelo JustGate.
- **Integração**: custo por obra → Sienge (via `cost_center`) e BI/Power BI.
- Cadastrar os **veículos reais no Core** (Gol AZK, Saveiro AZK, Saveiro AUB) p/ casar IDs 100%.
