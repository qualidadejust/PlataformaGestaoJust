# JustAtestados

Módulo de Atestados e Declarações de Comparecimento.

- **Portas**: Front 4701 / Back 4700
- **Stack**: React 19 + Vite 6, Express 4, Prisma 7 (PostgreSQL)
- **Papel**: lançamento (apontador) → fila de análise (RH aprova/recusa) → KPIs de absenteísmo
- **Dados**: guarda só a transação + snapshot; colaborador/obra/cargo vêm do Core; anexo sensível (CID/saúde) vai pro GED do Core como `sensivel` (guarda só o `ged_documento_id`)
- **Permissões**: `atestados.read/write/aprovar`; perfil `apontador`
- **Origem**: front adaptado do repo externo (`pridema1/atestadosJUST`), camada de dados trocada por `apiDataService`
