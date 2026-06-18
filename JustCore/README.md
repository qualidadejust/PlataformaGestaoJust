# JustCore — Dados-mestre da Plataforma de Gestão

Fonte **única** de cadastro (master data) consumida por todos os apps da
PlataformaGestão (JustEleva, JustSecurity, futuros). Um lugar pra cadastrar,
todos puxam automaticamente.

## Stack

- Prisma 7 + SQLite (`prisma/dev.db`), mesmo padrão do JustEleva
- Express 4 — API REST na porta **4100**
- IDs em UUID, tabelas snake_case (alinhado ao JustEleva p/ unificação)

## Rodar

```bash
npm install
npm run db:migrate     # aplica migrations
npm run db:seed        # popula com dados de exemplo
npm run server         # API em http://localhost:4100
```

## Entidades (dados-mestre)

| Entidade | Descrição |
|---|---|
| `empresas` | Empresas/CNPJs do grupo (empregador, contratante de obras) |
| `cargos` | Cargos/funções com nível (operacional…diretoria) |
| `obras` | Obras e sedes, com `cost_center` (centro de custo), empresa, status |
| `colaboradores` | Pessoas: matrícula, CPF, admissão, cargo, empresa, setor, status |
| `alocacoes` | Colaborador × obra × período (papel, principal, responsável) |
| `fornecedores` | Fornecedores de insumos/EPIs |
| `insumos` | Catálogo: EPIs (com C.A.), materiais, ferramentas, equipamentos |

## API

Todas as entidades expõem CRUD REST:

```
GET    /api/<entidade>        lista (com relações aninhadas)
GET    /api/<entidade>/:id    detalha
POST   /api/<entidade>        cria
PUT    /api/<entidade>/:id    edita
DELETE /api/<entidade>/:id    remove
GET    /api/health            status
```

Entidades: `empresas`, `cargos`, `obras`, `colaboradores`, `alocacoes`,
`fornecedores`, `insumos`.

## Como os apps consomem

Cada app guarda **só a sua transação** (entregas de EPI, avaliações…) e referencia
os IDs do Core. Para popular telas (dropdowns de colaborador, obra, EPI), o app
faz `GET http://localhost:4100/api/<entidade>`.

## Mapa de portas da plataforma

| App | Frontend | Backend |
|---|---|---|
| JustCore (dados-mestre) | 4101 | 4100 |
| JustEleva | 3000 | 3001 |
| JustSecurity | 4000 | 4001 |

## UI de gestão (admin)

`npm run dev` sobe a API (4100) + a UI de cadastros (**http://localhost:4101**).
Tela única com menu lateral por entidade; cada uma tem tabela + formulário
(criar/editar/excluir) genéricos, dirigidos por `src/entities.tsx`. Campos de
relação (empresa, cargo, fornecedor, obra) viram selects populados do próprio Core.
