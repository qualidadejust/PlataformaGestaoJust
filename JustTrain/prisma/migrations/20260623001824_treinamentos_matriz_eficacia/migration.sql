-- AlterTable
ALTER TABLE "turmas" ADD COLUMN "acao" TEXT;
ALTER TABLE "turmas" ADD COLUMN "eficacia_avaliar_em" TEXT;
ALTER TABLE "turmas" ADD COLUMN "eficacia_eficaz" BOOLEAN;
ALTER TABLE "turmas" ADD COLUMN "eficacia_em" TEXT;
ALTER TABLE "turmas" ADD COLUMN "eficacia_houve_nc" BOOLEAN;
ALTER TABLE "turmas" ADD COLUMN "eficacia_obs" TEXT;
ALTER TABLE "turmas" ADD COLUMN "eficacia_proc_seguidos" BOOLEAN;
ALTER TABLE "turmas" ADD COLUMN "objetivo" TEXT;
ALTER TABLE "turmas" ADD COLUMN "tipo" TEXT;

-- CreateTable
CREATE TABLE "requisitos_treinamento" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "cargo" TEXT NOT NULL,
    "treinamento_codigo" TEXT NOT NULL,
    "treinamento_nome" TEXT NOT NULL,
    "condicional" BOOLEAN NOT NULL DEFAULT false,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_treinamentos" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "nome" TEXT NOT NULL,
    "codigo" TEXT,
    "tipo" TEXT NOT NULL DEFAULT 'procedimento',
    "setor" TEXT NOT NULL DEFAULT 'sst',
    "carga_horaria" INTEGER NOT NULL DEFAULT 0,
    "validade_meses" INTEGER,
    "descricao" TEXT,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL
);
INSERT INTO "new_treinamentos" ("ativo", "carga_horaria", "codigo", "created_at", "descricao", "id", "nome", "setor", "updated_at", "validade_meses") SELECT "ativo", "carga_horaria", "codigo", "created_at", "descricao", "id", "nome", "setor", "updated_at", "validade_meses" FROM "treinamentos";
DROP TABLE "treinamentos";
ALTER TABLE "new_treinamentos" RENAME TO "treinamentos";
CREATE UNIQUE INDEX "treinamentos_codigo_key" ON "treinamentos"("codigo");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "requisitos_treinamento_cargo_idx" ON "requisitos_treinamento"("cargo");

-- CreateIndex
CREATE UNIQUE INDEX "requisitos_treinamento_cargo_treinamento_codigo_key" ON "requisitos_treinamento"("cargo", "treinamento_codigo");
