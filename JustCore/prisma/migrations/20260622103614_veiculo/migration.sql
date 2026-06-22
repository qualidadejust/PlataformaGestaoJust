-- CreateTable
CREATE TABLE "veiculos" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "placa" TEXT,
    "identificacao" TEXT,
    "modelo" TEXT,
    "marca" TEXT,
    "tipo" TEXT NOT NULL DEFAULT 'carro',
    "ano" INTEGER,
    "combustivel" TEXT,
    "km_atual" INTEGER,
    "empresa_id" TEXT,
    "status" TEXT NOT NULL DEFAULT 'ativo',
    "observacao" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "veiculos_empresa_id_fkey" FOREIGN KEY ("empresa_id") REFERENCES "empresas" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "veiculos_placa_key" ON "veiculos"("placa");
