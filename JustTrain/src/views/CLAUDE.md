# JustTrain/src/views — telas do JustTrain

Uma tela por arquivo, todas consumindo `api`/`core` de `../lib/cn`. **`TreinamentosView`** —
CRUD do catálogo de treinamentos (nome, código, tipo, setor, carga horária, validade).
**`TurmasView`** — lista/cria turmas (interna ou externa), abre `TurmaDetalheView`.
**`TurmaDetalheView`** — tela mais rica: adiciona participantes (busca colaborador no Core),
abre `AssinaturaModal` para assinar presença (canvas ou digital), emite certificado, arquiva
no GED (`FolderUp`), registra avaliação de eficácia. **`CertificadoView`** — preview e
download/impressão do certificado (PDF via `certificadoPdf.ts`; a imagem de preview é gerada
da mesma fonte do PDF final, "o que você vê é o que sai"). **`MatrizView`** — painel de
conformidade cargo×treinamento (em_dia/vencido/pendente) cruzando `RequisitoTreinamento` com
as participações concluídas do colaborador. **`CalendarioView`** — agrega turmas agendadas,
eficácias pendentes e certificados vencendo nos próximos 12 meses. **`FinalizarExternoView`**
— ponte do JustDocs: a partir de `?ged=<docId>`, RH escolhe o treinamento, confere os dados
lidos pela triagem IA e registra o certificado externo como participação `declarado`.

Ver docs/resumo-projeto.md (tabela de apps / seção 2, diagrama) para o contexto de arquitetura.
