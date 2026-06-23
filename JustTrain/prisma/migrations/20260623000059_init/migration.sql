-- CreateTable
CREATE TABLE "treinamentos" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "nome" TEXT NOT NULL,
    "codigo" TEXT,
    "setor" TEXT NOT NULL DEFAULT 'sst',
    "carga_horaria" INTEGER NOT NULL DEFAULT 0,
    "validade_meses" INTEGER,
    "descricao" TEXT,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "turmas" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "treinamento_id" TEXT NOT NULL,
    "treinamento_nome" TEXT NOT NULL,
    "treinamento_codigo" TEXT,
    "setor" TEXT NOT NULL DEFAULT 'sst',
    "carga_horaria" INTEGER NOT NULL DEFAULT 0,
    "validade_meses" INTEGER,
    "data" TEXT NOT NULL,
    "instrutor" TEXT,
    "local" TEXT,
    "status" TEXT NOT NULL DEFAULT 'aberta',
    "observacao" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "turmas_treinamento_id_fkey" FOREIGN KEY ("treinamento_id") REFERENCES "treinamentos" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "participacoes" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "turma_id" TEXT NOT NULL,
    "colaborador_id" TEXT,
    "colaborador_nome" TEXT NOT NULL,
    "colaborador_matricula" TEXT,
    "colaborador_cargo" TEXT,
    "empresa_nome" TEXT,
    "presente" BOOLEAN NOT NULL DEFAULT true,
    "assinatura_img" TEXT,
    "assinatura_tipo" TEXT,
    "bio_enrolled" BOOLEAN,
    "bio_match" BOOLEAN,
    "bio_score" REAL,
    "assinado_em" TEXT,
    "certificado_em" TEXT,
    "certificado_valido_ate" TEXT,
    "ged_documento_id" TEXT,
    "hash" TEXT,
    "hash_anterior" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "participacoes_turma_id_fkey" FOREIGN KEY ("turma_id") REFERENCES "turmas" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "turmas_treinamento_id_idx" ON "turmas"("treinamento_id");

-- CreateIndex
CREATE INDEX "turmas_data_idx" ON "turmas"("data");

-- CreateIndex
CREATE INDEX "participacoes_turma_id_idx" ON "participacoes"("turma_id");

-- CreateIndex
CREATE INDEX "participacoes_colaborador_id_idx" ON "participacoes"("colaborador_id");

-- CreateIndex
CREATE UNIQUE INDEX "participacoes_turma_id_colaborador_id_key" ON "participacoes"("turma_id", "colaborador_id");
