-- CreateTable
CREATE TABLE "indicador_realizacoes" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "indicador_id" TEXT NOT NULL,
    "employee_id" TEXT,
    "periodo" TEXT NOT NULL,
    "valor" TEXT,
    "valor_num" REAL,
    "observacao" TEXT,
    "evidencia_url" TEXT,
    "lancado_por" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "indicador_realizacoes_indicador_id_fkey" FOREIGN KEY ("indicador_id") REFERENCES "indicadores" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "indicador_realizacoes_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "employees" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "indicador_realizacoes_indicador_id_idx" ON "indicador_realizacoes"("indicador_id");

-- CreateIndex
CREATE UNIQUE INDEX "indicador_realizacoes_indicador_id_employee_id_periodo_key" ON "indicador_realizacoes"("indicador_id", "employee_id", "periodo");
