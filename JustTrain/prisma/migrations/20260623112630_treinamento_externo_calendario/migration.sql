-- AlterTable
ALTER TABLE "participacoes" ADD COLUMN "certificado_externo_id" TEXT;

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_turmas" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "treinamento_id" TEXT NOT NULL,
    "treinamento_nome" TEXT NOT NULL,
    "treinamento_codigo" TEXT,
    "tipo" TEXT,
    "setor" TEXT NOT NULL DEFAULT 'sst',
    "carga_horaria" INTEGER NOT NULL DEFAULT 0,
    "validade_meses" INTEGER,
    "data" TEXT NOT NULL,
    "instrutor" TEXT,
    "local" TEXT,
    "origem" TEXT NOT NULL DEFAULT 'interna',
    "entidade_externa" TEXT,
    "objetivo" TEXT,
    "acao" TEXT,
    "status" TEXT NOT NULL DEFAULT 'aberta',
    "observacao" TEXT,
    "eficacia_avaliar_em" TEXT,
    "eficacia_em" TEXT,
    "eficacia_proc_seguidos" BOOLEAN,
    "eficacia_houve_nc" BOOLEAN,
    "eficacia_eficaz" BOOLEAN,
    "eficacia_obs" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "turmas_treinamento_id_fkey" FOREIGN KEY ("treinamento_id") REFERENCES "treinamentos" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_turmas" ("acao", "carga_horaria", "created_at", "data", "eficacia_avaliar_em", "eficacia_eficaz", "eficacia_em", "eficacia_houve_nc", "eficacia_obs", "eficacia_proc_seguidos", "id", "instrutor", "local", "objetivo", "observacao", "setor", "status", "tipo", "treinamento_codigo", "treinamento_id", "treinamento_nome", "updated_at", "validade_meses") SELECT "acao", "carga_horaria", "created_at", "data", "eficacia_avaliar_em", "eficacia_eficaz", "eficacia_em", "eficacia_houve_nc", "eficacia_obs", "eficacia_proc_seguidos", "id", "instrutor", "local", "objetivo", "observacao", "setor", "status", "tipo", "treinamento_codigo", "treinamento_id", "treinamento_nome", "updated_at", "validade_meses" FROM "turmas";
DROP TABLE "turmas";
ALTER TABLE "new_turmas" RENAME TO "turmas";
CREATE INDEX "turmas_treinamento_id_idx" ON "turmas"("treinamento_id");
CREATE INDEX "turmas_data_idx" ON "turmas"("data");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
