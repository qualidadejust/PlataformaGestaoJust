# JustCore/scripts — utilitários pontuais

Scripts auxiliares fora do ciclo padrão de import/seed do Prisma (esses ficam em
`prisma/import-*.ts`/`seed*.ts`). Hoje contém `perfilar-docs-rh.ts` — análise/perfilamento de
documentos de RH.

São scripts de manutenção/análise pontual, não rotas nem parte do runtime do app; rodar sob
demanda via `tsx`.

Ver `docs/resumo-projeto.md` seção 4.
