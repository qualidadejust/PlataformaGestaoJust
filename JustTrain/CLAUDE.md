# JustTrain

Módulo de Treinamentos.

- **Portas**: Front 4601 / Back 4600
- **Stack**: React 19 + Vite 6, Express 4, Prisma 7 (PostgreSQL), jsPDF (certificados)
- **Papel**: catálogo de treinamentos (NR/integração/IT/sistema), turmas internas (presença assinada com biometria) e externas (SECONCI/SENAI), certificado único arquivado no GED do Core, avaliação de eficácia 30 dias (PBQP-H), matriz cargo×treinamento, calendário
- **Dados**: snapshot do Core; biometria reaproveita o fluxo do Security
