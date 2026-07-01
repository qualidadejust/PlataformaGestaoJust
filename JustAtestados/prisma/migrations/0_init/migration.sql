-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateTable
CREATE TABLE "atestados" (
    "id" TEXT NOT NULL,
    "ticket" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pendente',
    "colaborador_id" TEXT,
    "colaborador_nome" TEXT,
    "matricula" TEXT,
    "cargo" TEXT,
    "setor" TEXT,
    "gestor" TEXT,
    "obra_id" TEXT,
    "obra_nome" TEXT,
    "obra_uf" TEXT,
    "centro_custo" TEXT,
    "data_lancamento" TEXT NOT NULL,
    "data_analise" TEXT,
    "analista" TEXT,
    "apontador_id" TEXT,
    "apontador_nome" TEXT,
    "motivo" TEXT,
    "data_emissao" TEXT,
    "dias" INTEGER,
    "cid_codigo" TEXT,
    "cid_descricao" TEXT,
    "medico_nome" TEXT,
    "medico_crm" TEXT,
    "data_comparecimento" TEXT,
    "periodo" TEXT,
    "hora_inicio" TEXT,
    "hora_fim" TEXT,
    "horas" DOUBLE PRECISION,
    "local" TEXT,
    "ged_documento_id" TEXT,
    "anexo_nome" TEXT,
    "origem" TEXT NOT NULL DEFAULT 'manual',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "atestados_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "eventos_atestado" (
    "id" TEXT NOT NULL,
    "usuario" TEXT,
    "acao" TEXT NOT NULL,
    "modulo" TEXT,
    "detalhe" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "eventos_atestado_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "atestados_ticket_key" ON "atestados"("ticket");

-- CreateIndex
CREATE INDEX "atestados_colaborador_id_idx" ON "atestados"("colaborador_id");

-- CreateIndex
CREATE INDEX "atestados_obra_id_idx" ON "atestados"("obra_id");

-- CreateIndex
CREATE INDEX "atestados_status_idx" ON "atestados"("status");

-- CreateIndex
CREATE INDEX "atestados_data_lancamento_idx" ON "atestados"("data_lancamento");

-- CreateIndex
CREATE INDEX "eventos_atestado_created_at_idx" ON "eventos_atestado"("created_at");

