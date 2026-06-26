# JustFrota

Módulo de Gestão de Frota.

- **Portas**: Front 4301 / Back 4300
- **Stack**: React 19 + Vite 6, Express 4, Prisma 7 (PostgreSQL)
- **Papel**: diário de bordo (viagens), abastecimento, manutenção, custos fixos, e rateio de custos por km entre obras
- **Dados**: guarda só transações; veículo/motorista/obra vêm do Core (modelo `Veiculo` com dados FIPE/depreciação)
