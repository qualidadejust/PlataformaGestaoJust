# JustDocs — GED da Plataforma JUST

Front (Vite/React/Tailwind v4/React Query, porta **4400**) da **gestão eletrônica de
documentos**. Não tem banco próprio: todo o GED vive no **JustCore** (modelos `Documento` e
`TipoDocumento`, rota `/api/documentos`, storage no SharePoint). O JustDocs é a interface —
proxy `/api` → Core (4100). Ver skill `ged-documentos` e seções 4/11 de `docs/resumo-projeto.md`.

## Rodar (dev)

```bash
cd JustDocs
npm install
npm run dev        # http://localhost:4400   (suba o JustCore 4100 antes)
```

## Telas

- **Documentos** — filtra por tipo de entidade (colaborador/obra/veículo/fornecedor) →
  entidade → tipo de documento; envia arquivo (com tipo, sensível/LGPD, validade, observação),
  lista, baixa (download mediado pelo Core), exclui e cria **nova versão** (versionamento).
- **Vencimentos** — documentos com validade (ASO, alvará, licença, CRLV…), destacando
  vencidos e os que vencem em ≤ 30 dias.

## Como conversa com o Core

- Cadastros (entidades): `/api/colaboradores`, `/api/obras`, `/api/veiculos`, `/api/fornecedores`.
- Catálogo de tipos: `/api/tipos-documento` (gerenciável na tela do Core).
- Documentos: `/api/documentos` (upload multipart, lista, `/:id/download`, `/:id/versoes`, delete).

## Próximos passos

- Resolver o **nome da entidade** nos vencimentos (hoje mostra tipo + id curto).
- Busca full-text (Graph) e visão de histórico de versões inline.
- Embutir blocos de "anexar documento" dentro dos outros apps reusando esta API.
