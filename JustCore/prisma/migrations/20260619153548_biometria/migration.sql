-- CreateTable
CREATE TABLE "biometrias" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "colaborador_id" TEXT NOT NULL,
    "dedo" TEXT,
    "template" TEXT NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "biometrias_colaborador_id_fkey" FOREIGN KEY ("colaborador_id") REFERENCES "colaboradores" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "biometrias_colaborador_id_idx" ON "biometrias"("colaborador_id");
