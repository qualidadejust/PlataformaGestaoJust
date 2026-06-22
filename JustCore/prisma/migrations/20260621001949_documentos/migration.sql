-- CreateTable
CREATE TABLE "documentos" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "entidade_tipo" TEXT NOT NULL,
    "entidade_id" TEXT NOT NULL,
    "categoria" TEXT NOT NULL,
    "nome_original" TEXT NOT NULL,
    "content_type" TEXT,
    "tamanho" INTEGER NOT NULL DEFAULT 0,
    "hash" TEXT,
    "sensivel" BOOLEAN NOT NULL DEFAULT false,
    "storage_driver" TEXT NOT NULL DEFAULT 'local',
    "sp_drive_id" TEXT,
    "sp_item_id" TEXT NOT NULL,
    "sp_web_url" TEXT,
    "uploaded_by" TEXT,
    "retido_ate" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL
);

-- CreateIndex
CREATE INDEX "documentos_entidade_tipo_entidade_id_idx" ON "documentos"("entidade_tipo", "entidade_id");

-- CreateIndex
CREATE INDEX "documentos_categoria_idx" ON "documentos"("categoria");
