-- CreateTable
CREATE TABLE "entregas" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "colaborador_id" TEXT,
    "colaborador_nome" TEXT NOT NULL,
    "colaborador_matricula" TEXT,
    "colaborador_cargo" TEXT,
    "empresa_nome" TEXT,
    "epi_id" TEXT,
    "epi_nome" TEXT NOT NULL,
    "epi_ca" TEXT,
    "quantidade" INTEGER NOT NULL DEFAULT 1,
    "entregue_em" TEXT NOT NULL,
    "assinatura_img" TEXT,
    "assinatura_tipo" TEXT,
    "observacao" TEXT,
    "hash" TEXT,
    "hash_anterior" TEXT,
    "motivo" TEXT,
    "ficha_id" INTEGER,
    "bio_enrolled" INTEGER,
    "bio_match" INTEGER,
    "bio_score" REAL
);

-- CreateTable
CREATE TABLE "fichas" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "colaborador_id" TEXT,
    "colaborador_nome" TEXT NOT NULL,
    "colaborador_matricula" TEXT,
    "colaborador_cargo" TEXT,
    "empresa_nome" TEXT,
    "epi_id" TEXT,
    "epi_nome" TEXT NOT NULL,
    "epi_ca" TEXT,
    "tipo_controle" TEXT NOT NULL DEFAULT 'prazo',
    "validade_dias" INTEGER,
    "alerta_dias" INTEGER,
    "origem" TEXT NOT NULL DEFAULT 'inicial',
    "entrega_id" INTEGER,
    "entregue_em" TEXT NOT NULL,
    "vence_em" TEXT,
    "proxima_inspecao_em" TEXT,
    "status" TEXT NOT NULL DEFAULT 'ativa',
    "baixa_motivo" TEXT,
    "baixa_em" TEXT,
    "baixa_obs" TEXT,
    "substitui_ficha_id" INTEGER,
    "created_at" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "inspecoes" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "ficha_id" INTEGER NOT NULL,
    "data" TEXT NOT NULL,
    "resultado" TEXT NOT NULL,
    "proxima_inspecao_em" TEXT,
    "inspetor" TEXT,
    "observacao" TEXT,
    "created_at" TEXT NOT NULL,
    "inspetor_id" TEXT,
    "assinatura_img" TEXT,
    "assinatura_tipo" TEXT
);

-- CreateIndex
CREATE INDEX "idx_fichas_colab" ON "fichas"("colaborador_id");

-- CreateIndex
CREATE INDEX "idx_fichas_status" ON "fichas"("status");

-- CreateIndex
CREATE INDEX "idx_inspecoes_ficha" ON "inspecoes"("ficha_id");
