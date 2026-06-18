# Plataforma de Gestão JUST

Monorepo da plataforma de gestão da **Construtora JUST**, composta por apps que
compartilham um único núcleo de dados-mestre (**JustCore**).

## Apps

| App | Pasta | Front | Back | Descrição |
|---|---|---|---|---|
| **JustCore** | `JustCore/` | 4101 | 4100 | Dados-mestre da plataforma (empresas, obras, colaboradores, cargos, setores, fornecedores, insumos/EPIs, indicadores). Fonte única que os outros apps consomem. |
| **JustEleva** | `JustEleva/app/` | 3000 | 3001 | Gestão de desempenho: avaliações por competência, PDI, feedback, movimentação, pesquisa de clima, indicadores. |
| **JustSecurity** | `JustSecurity/` | 4000 | 4001 | Segurança do Trabalho: entrega de EPI assinada por **digital (HID U.are.U 4500)** com termo jurídico e cadeia de hash. |

## Arquitetura

O **JustCore** é o dono dos cadastros. Cada app guarda apenas suas transações e
referencia os IDs do Core. Ex.: o JustSecurity puxa colaboradores e EPIs do Core
(proxy `/core`) e guarda só as entregas (com snapshot dos dados na hora da entrega).

```
JustCore (4100)  ──►  dados-mestre (SQLite + Prisma)
   ▲        ▲
   │        └── JustSecurity (4001) — entregas de EPI
   └─────────── JustEleva (3001)    — avaliações de desempenho
```

## Como rodar (cada app)

```bash
cd <app>
npm install
# JustCore / JustEleva (Prisma):
npm run db:migrate && npm run db:seed
npm run dev
```

Suba o **JustCore primeiro** (os demais dependem dele para os cadastros).

## Dados sensíveis

Planilhas com dados pessoais (CPF, RG, PIS, endereços) e os bancos SQLite **não
são versionados** (ver `.gitignore`). Os cadastros são recriados via seed/migration
e pelos importadores em `JustCore/prisma/` (`import-*.ts`).
