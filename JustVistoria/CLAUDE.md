# JustVistoria

Módulo de Vistoria e Entrega de Obra.

- **Portas**: Front 4801 / Back 4800
- **Stack**: React 19 + Vite 6, Express 4, Prisma 7 (PostgreSQL), multer (upload de fotos)
- **Papel**: pipeline por unidade (Construção→Inspeção Final→Vistoria do Cliente→Entrega das Chaves), checklist (motor de formulários do Core), não-conformidades com bloqueio, termos assinados em tela→GED, relatório PDF
- **Dados**: Cliente/Unidade vêm do Core; integra cronograma Prevision (locais/pacotes/prazos); guarda só transações
