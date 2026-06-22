-- CreateTable
CREATE TABLE "viagens" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "data" TEXT NOT NULL,
    "veiculo_id" TEXT,
    "veiculo_nome" TEXT,
    "motorista_id" TEXT,
    "motorista_nome" TEXT,
    "obra_id" TEXT,
    "obra_nome" TEXT,
    "destino" TEXT,
    "observacao" TEXT,
    "hora_inicio" TEXT,
    "hora_fim" TEXT,
    "km_inicial" INTEGER,
    "km_final" INTEGER,
    "km_rodado" INTEGER,
    "status" TEXT NOT NULL DEFAULT 'finalizada',
    "origem" TEXT NOT NULL DEFAULT 'manual',
    "criado_por" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL
);

-- CreateIndex
CREATE INDEX "viagens_veiculo_id_idx" ON "viagens"("veiculo_id");

-- CreateIndex
CREATE INDEX "viagens_obra_id_idx" ON "viagens"("obra_id");

-- CreateIndex
CREATE INDEX "viagens_data_idx" ON "viagens"("data");
