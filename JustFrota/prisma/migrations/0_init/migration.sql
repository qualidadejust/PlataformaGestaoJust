-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateTable
CREATE TABLE "viagens" (
    "id" TEXT NOT NULL,
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
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "viagens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "abastecimentos" (
    "id" TEXT NOT NULL,
    "data" TEXT NOT NULL,
    "veiculo_id" TEXT,
    "veiculo_nome" TEXT,
    "litros" DOUBLE PRECISION,
    "valor" DOUBLE PRECISION NOT NULL,
    "km" INTEGER,
    "combustivel" TEXT,
    "posto" TEXT,
    "observacao" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "abastecimentos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "manutencoes" (
    "id" TEXT NOT NULL,
    "data" TEXT NOT NULL,
    "veiculo_id" TEXT,
    "veiculo_nome" TEXT,
    "tipo" TEXT NOT NULL DEFAULT 'corretiva',
    "descricao" TEXT,
    "valor" DOUBLE PRECISION NOT NULL,
    "km" INTEGER,
    "fornecedor" TEXT,
    "observacao" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "manutencoes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "custos_fixos" (
    "id" TEXT NOT NULL,
    "competencia" TEXT NOT NULL,
    "veiculo_id" TEXT,
    "veiculo_nome" TEXT,
    "tipo" TEXT NOT NULL,
    "descricao" TEXT,
    "valor" DOUBLE PRECISION NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "custos_fixos_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "viagens_veiculo_id_idx" ON "viagens"("veiculo_id");

-- CreateIndex
CREATE INDEX "viagens_obra_id_idx" ON "viagens"("obra_id");

-- CreateIndex
CREATE INDEX "viagens_data_idx" ON "viagens"("data");

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
