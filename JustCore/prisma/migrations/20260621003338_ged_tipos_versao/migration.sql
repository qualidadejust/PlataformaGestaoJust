/*
  Warnings:

  - Added the required column `grupo_id` to the `documentos` table without a default value. This is not possible if the table is not empty.

*/
-- CreateTable
CREATE TABLE "tipos_documento" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "codigo" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "entidade_tipo" TEXT NOT NULL,
    "sensivel_padrao" BOOLEAN NOT NULL DEFAULT false,
    "versionavel" BOOLEAN NOT NULL DEFAULT false,
    "vence" BOOLEAN NOT NULL DEFAULT false,
    "retencao_dias" INTEGER,
    "obrigatorio" BOOLEAN NOT NULL DEFAULT false,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_documentos" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "entidade_tipo" TEXT NOT NULL,
    "entidade_id" TEXT NOT NULL,
    "categoria" TEXT NOT NULL,
    "tipo_codigo" TEXT,
    "nome_original" TEXT NOT NULL,
    "content_type" TEXT,
    "tamanho" INTEGER NOT NULL DEFAULT 0,
    "hash" TEXT,
    "sensivel" BOOLEAN NOT NULL DEFAULT false,
    "metadados" TEXT,
    "grupo_id" TEXT NOT NULL,
    "versao" INTEGER NOT NULL DEFAULT 1,
    "status" TEXT NOT NULL DEFAULT 'vigente',
    "valido_ate" TEXT,
    "storage_driver" TEXT NOT NULL DEFAULT 'local',
    "sp_drive_id" TEXT,
    "sp_item_id" TEXT NOT NULL,
    "sp_web_url" TEXT,
    "uploaded_by" TEXT,
    "retido_ate" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL
);
INSERT INTO "new_documentos" ("categoria", "content_type", "created_at", "entidade_id", "entidade_tipo", "hash", "id", "nome_original", "retido_ate", "sensivel", "sp_drive_id", "sp_item_id", "sp_web_url", "storage_driver", "tamanho", "updated_at", "uploaded_by") SELECT "categoria", "content_type", "created_at", "entidade_id", "entidade_tipo", "hash", "id", "nome_original", "retido_ate", "sensivel", "sp_drive_id", "sp_item_id", "sp_web_url", "storage_driver", "tamanho", "updated_at", "uploaded_by" FROM "documentos";
DROP TABLE "documentos";
ALTER TABLE "new_documentos" RENAME TO "documentos";
CREATE INDEX "documentos_entidade_tipo_entidade_id_idx" ON "documentos"("entidade_tipo", "entidade_id");
CREATE INDEX "documentos_categoria_idx" ON "documentos"("categoria");
CREATE INDEX "documentos_grupo_id_idx" ON "documentos"("grupo_id");
CREATE INDEX "documentos_tipo_codigo_idx" ON "documentos"("tipo_codigo");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "tipos_documento_codigo_key" ON "tipos_documento"("codigo");

-- CreateIndex
CREATE INDEX "tipos_documento_entidade_tipo_idx" ON "tipos_documento"("entidade_tipo");
