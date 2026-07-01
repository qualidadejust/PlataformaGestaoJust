-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateTable
CREATE TABLE "treinamentos" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "codigo" TEXT,
    "tipo" TEXT NOT NULL DEFAULT 'procedimento',
    "setor" TEXT NOT NULL DEFAULT 'sst',
    "carga_horaria" INTEGER NOT NULL DEFAULT 0,
    "validade_meses" INTEGER,
    "descricao" TEXT,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "treinamentos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "requisitos_treinamento" (
    "id" TEXT NOT NULL,
    "cargo" TEXT NOT NULL,
    "treinamento_codigo" TEXT NOT NULL,
    "treinamento_nome" TEXT NOT NULL,
    "condicional" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "requisitos_treinamento_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "turmas" (
    "id" TEXT NOT NULL,
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
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "turmas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "participacoes" (
    "id" TEXT NOT NULL,
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
    "bio_score" DOUBLE PRECISION,
    "assinado_em" TEXT,
    "certificado_em" TEXT,
    "certificado_valido_ate" TEXT,
    "ged_documento_id" TEXT,
    "certificado_externo_id" TEXT,
    "hash" TEXT,
    "hash_anterior" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "participacoes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "treinamentos_codigo_key" ON "treinamentos"("codigo");

-- CreateIndex
CREATE INDEX "requisitos_treinamento_cargo_idx" ON "requisitos_treinamento"("cargo");

-- CreateIndex
CREATE UNIQUE INDEX "requisitos_treinamento_cargo_treinamento_codigo_key" ON "requisitos_treinamento"("cargo", "treinamento_codigo");

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

-- AddForeignKey
ALTER TABLE "turmas" ADD CONSTRAINT "turmas_treinamento_id_fkey" FOREIGN KEY ("treinamento_id") REFERENCES "treinamentos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "participacoes" ADD CONSTRAINT "participacoes_turma_id_fkey" FOREIGN KEY ("turma_id") REFERENCES "turmas"("id") ON DELETE CASCADE ON UPDATE CASCADE;
