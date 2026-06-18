-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_indicadores" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "nome" TEXT NOT NULL,
    "descricao" TEXT,
    "unidade" TEXT,
    "direcao" TEXT NOT NULL DEFAULT 'maior',
    "cargo_alvo" TEXT,
    "setor" TEXT,
    "formula" TEXT,
    "meta" TEXT,
    "periodicidade" TEXT,
    "responsavel" TEXT,
    "acumula" BOOLEAN NOT NULL DEFAULT false,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL
);
INSERT INTO "new_indicadores" ("ativo", "cargo_alvo", "created_at", "descricao", "direcao", "formula", "id", "meta", "nome", "periodicidade", "responsavel", "setor", "unidade", "updated_at") SELECT "ativo", "cargo_alvo", "created_at", "descricao", "direcao", "formula", "id", "meta", "nome", "periodicidade", "responsavel", "setor", "unidade", "updated_at" FROM "indicadores";
DROP TABLE "indicadores";
ALTER TABLE "new_indicadores" RENAME TO "indicadores";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
