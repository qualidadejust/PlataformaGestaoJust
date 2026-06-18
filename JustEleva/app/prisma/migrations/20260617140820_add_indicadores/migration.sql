-- CreateTable
CREATE TABLE "indicadores" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "nome" TEXT NOT NULL,
    "descricao" TEXT,
    "unidade" TEXT,
    "direcao" TEXT NOT NULL DEFAULT 'maior',
    "cargo_alvo" TEXT,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "indicador_atribuicoes" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "indicador_id" TEXT NOT NULL,
    "employee_id" TEXT NOT NULL,
    "meta" TEXT,
    "peso" INTEGER NOT NULL DEFAULT 1,
    "fonte" TEXT NOT NULL DEFAULT 'avaliador',
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "indicador_atribuicoes_indicador_id_fkey" FOREIGN KEY ("indicador_id") REFERENCES "indicadores" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "indicador_atribuicoes_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "employees" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "indicador_atribuicoes_employee_id_idx" ON "indicador_atribuicoes"("employee_id");

-- CreateIndex
CREATE UNIQUE INDEX "indicador_atribuicoes_indicador_id_employee_id_key" ON "indicador_atribuicoes"("indicador_id", "employee_id");
