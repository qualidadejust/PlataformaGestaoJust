-- CreateTable
CREATE TABLE "obras" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "nome" TEXT NOT NULL,
    "cost_center" TEXT,
    "tipo" TEXT NOT NULL DEFAULT 'obra',
    "status" TEXT NOT NULL DEFAULT 'ativa',
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "alocacoes" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "employee_id" TEXT NOT NULL,
    "obra_id" TEXT NOT NULL,
    "papel_na_obra" TEXT NOT NULL DEFAULT 'mao_de_obra',
    "principal" BOOLEAN NOT NULL DEFAULT false,
    "data_inicio" TEXT,
    "data_fim" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "alocacoes_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "employees" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "alocacoes_obra_id_fkey" FOREIGN KEY ("obra_id") REFERENCES "obras" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "obras_cost_center_key" ON "obras"("cost_center");

-- CreateIndex
CREATE INDEX "alocacoes_employee_id_idx" ON "alocacoes"("employee_id");

-- CreateIndex
CREATE INDEX "alocacoes_obra_id_idx" ON "alocacoes"("obra_id");
