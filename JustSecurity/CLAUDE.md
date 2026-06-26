# JustSecurity

Módulo de Segurança do Trabalho.

- **Portas**: Front 4000 / Back 4001
- **Stack**: React 19 + Vite 6, Express 4, Prisma 7 (PostgreSQL)
- **Papel**: entrega de EPI com assinatura por digital (HID U.are.U 4500), fichas de EPI, inspeção/troca/baixa, relatórios
- **Biometria**: usa o serviço .NET SourceAFIS (porta 4002) em `biometria/` para match de digitais
- **Dados**: guarda só transações de EPI; colaborador/obra/insumo vêm do Core
- **Schema legado**: `id` Int e datas String (válidos no Postgres)
