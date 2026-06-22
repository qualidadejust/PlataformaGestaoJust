-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_insumos" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "nome" TEXT NOT NULL,
    "categoria" TEXT NOT NULL DEFAULT 'material',
    "unidade" TEXT NOT NULL DEFAULT 'un',
    "ca" TEXT,
    "cod_sienge" TEXT,
    "validade_dias" INTEGER,
    "alerta_dias" INTEGER,
    "tipo_controle" TEXT NOT NULL DEFAULT 'prazo',
    "inspecionavel" BOOLEAN NOT NULL DEFAULT false,
    "descricao" TEXT,
    "fornecedor_id" TEXT,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "insumos_fornecedor_id_fkey" FOREIGN KEY ("fornecedor_id") REFERENCES "fornecedores" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_insumos" ("alerta_dias", "ativo", "ca", "categoria", "cod_sienge", "created_at", "descricao", "fornecedor_id", "id", "nome", "tipo_controle", "unidade", "updated_at", "validade_dias") SELECT "alerta_dias", "ativo", "ca", "categoria", "cod_sienge", "created_at", "descricao", "fornecedor_id", "id", "nome", "tipo_controle", "unidade", "updated_at", "validade_dias" FROM "insumos";
DROP TABLE "insumos";
ALTER TABLE "new_insumos" RENAME TO "insumos";
CREATE INDEX "insumos_categoria_idx" ON "insumos"("categoria");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
