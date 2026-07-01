-- Fila de análise (JustDocs) + triagem pendente do WhatsApp (JustGate).
-- Aditivo: 2 colunas novas em "documentos" + 1 tabela nova. Não toca dados existentes.

-- Documento: canal de entrada + estado na fila de conferência.
ALTER TABLE "documentos" ADD COLUMN "origem" TEXT;
ALTER TABLE "documentos" ADD COLUMN "analise" TEXT;
CREATE INDEX "documentos_analise_idx" ON "documentos"("analise");

-- Proposta de lançamento pendente de confirmação no WhatsApp.
CREATE TABLE "triagem_pendentes" (
    "id" TEXT NOT NULL,
    "telefone" TEXT NOT NULL,
    "colaborador_id" TEXT NOT NULL,
    "colaborador_nome" TEXT NOT NULL,
    "media_id" TEXT NOT NULL,
    "arquivo" TEXT NOT NULL,
    "entidade_tipo" TEXT NOT NULL DEFAULT 'colaborador',
    "tipo_codigo" TEXT,
    "destino" TEXT NOT NULL DEFAULT 'ged',
    "sensivel" BOOLEAN NOT NULL DEFAULT false,
    "valido_ate" TEXT,
    "dados_extraidos" TEXT NOT NULL DEFAULT '{}',
    "resumo" TEXT,
    "confianca" TEXT,
    "message_id" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'aguardando',
    "doc_id" TEXT,
    "expira_em" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "triagem_pendentes_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "triagem_pendentes_message_id_key" ON "triagem_pendentes"("message_id");
CREATE INDEX "triagem_pendentes_telefone_idx" ON "triagem_pendentes"("telefone");
CREATE INDEX "triagem_pendentes_status_idx" ON "triagem_pendentes"("status");
