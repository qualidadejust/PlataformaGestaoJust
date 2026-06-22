-- CreateTable
CREATE TABLE "abastecimentos" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "data" TEXT NOT NULL,
    "veiculo_id" TEXT,
    "veiculo_nome" TEXT,
    "litros" REAL,
    "valor" REAL NOT NULL,
    "km" INTEGER,
    "combustivel" TEXT,
    "posto" TEXT,
    "observacao" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "manutencoes" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "data" TEXT NOT NULL,
    "veiculo_id" TEXT,
    "veiculo_nome" TEXT,
    "tipo" TEXT NOT NULL DEFAULT 'corretiva',
    "descricao" TEXT,
    "valor" REAL NOT NULL,
    "km" INTEGER,
    "fornecedor" TEXT,
    "observacao" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "custos_fixos" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "competencia" TEXT NOT NULL,
    "veiculo_id" TEXT,
    "veiculo_nome" TEXT,
    "tipo" TEXT NOT NULL,
    "descricao" TEXT,
    "valor" REAL NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL
);

-- CreateIndex
CREATE INDEX "abastecimentos_veiculo_id_idx" ON "abastecimentos"("veiculo_id");

-- CreateIndex
CREATE INDEX "abastecimentos_data_idx" ON "abastecimentos"("data");

-- CreateIndex
CREATE INDEX "manutencoes_veiculo_id_idx" ON "manutencoes"("veiculo_id");

-- CreateIndex
CREATE INDEX "manutencoes_data_idx" ON "manutencoes"("data");

-- CreateIndex
CREATE INDEX "custos_fixos_veiculo_id_idx" ON "custos_fixos"("veiculo_id");

-- CreateIndex
CREATE INDEX "custos_fixos_competencia_idx" ON "custos_fixos"("competencia");
