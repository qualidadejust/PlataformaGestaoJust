-- CreateTable
CREATE TABLE "custos_cargo" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "cargo" TEXT NOT NULL,
    "competencia" TEXT NOT NULL,
    "salario_base" REAL,
    "custo_mensal" REAL NOT NULL,
    "jornada_horas" INTEGER NOT NULL DEFAULT 220,
    "fonte" TEXT,
    "observacao" TEXT,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL
);

-- CreateIndex
CREATE INDEX "custos_cargo_cargo_idx" ON "custos_cargo"("cargo");

-- CreateIndex
CREATE UNIQUE INDEX "custos_cargo_cargo_competencia_key" ON "custos_cargo"("cargo", "competencia");
