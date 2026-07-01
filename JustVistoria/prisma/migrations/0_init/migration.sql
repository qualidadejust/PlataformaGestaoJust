-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateTable
CREATE TABLE "cronograma_tarefas" (
    "id" TEXT NOT NULL,
    "prevision_id" TEXT NOT NULL,
    "obra_id" TEXT,
    "servico" TEXT NOT NULL,
    "pacote" TEXT NOT NULL,
    "job" TEXT,
    "local" TEXT NOT NULL,
    "unidade_id" TEXT,
    "inicio" TEXT,
    "fim" TEXT,
    "critico" BOOLEAN NOT NULL DEFAULT false,
    "predecessores" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "cronograma_tarefas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "etapas_unidade" (
    "id" TEXT NOT NULL,
    "unidade_id" TEXT NOT NULL,
    "unidade_label" TEXT NOT NULL,
    "obra_id" TEXT,
    "tipo" TEXT NOT NULL,
    "situacao" TEXT NOT NULL DEFAULT 'nao_iniciada',
    "previsto_de" TEXT,
    "previsto_ate" TEXT,
    "realizado_de" TEXT,
    "realizado_ate" TEXT,
    "observacao" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "etapas_unidade_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "itens_etapa" (
    "id" TEXT NOT NULL,
    "etapa_id" TEXT NOT NULL,
    "situacao" TEXT NOT NULL DEFAULT 'agendada',
    "responsavel_id" TEXT,
    "responsavel_nome" TEXT,
    "cliente_id" TEXT,
    "cliente_nome" TEXT,
    "previsto_de" TEXT,
    "previsto_ate" TEXT,
    "realizado_de" TEXT,
    "realizado_ate" TEXT,
    "instancia_id" TEXT,
    "observacao" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "itens_etapa_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "formulario_modelos" (
    "id" TEXT NOT NULL,
    "codigo" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "versao" INTEGER NOT NULL DEFAULT 1,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "estrutura" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "formulario_modelos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "formulario_instancias" (
    "id" TEXT NOT NULL,
    "modelo_id" TEXT NOT NULL,
    "modelo_codigo" TEXT NOT NULL,
    "modelo_versao" INTEGER NOT NULL,
    "unidade_id" TEXT NOT NULL,
    "unidade_label" TEXT NOT NULL,
    "respostas" TEXT NOT NULL,
    "total_nc" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "formulario_instancias_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "nao_conformidades" (
    "id" TEXT NOT NULL,
    "instancia_id" TEXT,
    "unidade_id" TEXT NOT NULL,
    "unidade_label" TEXT NOT NULL,
    "titulo" TEXT NOT NULL,
    "descricao" TEXT,
    "severidade" TEXT NOT NULL DEFAULT 'media',
    "foto_doc_id" TEXT,
    "status" TEXT NOT NULL DEFAULT 'aberta',
    "responsavel" TEXT,
    "prazo" TEXT,
    "reverificada_em" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "nao_conformidades_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "termos" (
    "id" TEXT NOT NULL,
    "unidade_id" TEXT NOT NULL,
    "unidade_label" TEXT NOT NULL,
    "cliente_id" TEXT,
    "cliente_nome" TEXT NOT NULL,
    "cliente_cpf" TEXT,
    "tipo" TEXT NOT NULL,
    "modalidade" TEXT,
    "protocolo" TEXT NOT NULL,
    "conteudo" TEXT NOT NULL,
    "assinatura_img" TEXT NOT NULL,
    "assinado_em" TEXT NOT NULL,
    "hash" TEXT NOT NULL,
    "ged_doc_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "termos_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "cronograma_tarefas_prevision_id_key" ON "cronograma_tarefas"("prevision_id");

-- CreateIndex
CREATE INDEX "cronograma_tarefas_obra_id_idx" ON "cronograma_tarefas"("obra_id");

-- CreateIndex
CREATE INDEX "cronograma_tarefas_unidade_id_idx" ON "cronograma_tarefas"("unidade_id");

-- CreateIndex
CREATE INDEX "cronograma_tarefas_pacote_idx" ON "cronograma_tarefas"("pacote");

-- CreateIndex
CREATE INDEX "etapas_unidade_unidade_id_idx" ON "etapas_unidade"("unidade_id");

-- CreateIndex
CREATE INDEX "etapas_unidade_tipo_idx" ON "etapas_unidade"("tipo");

-- CreateIndex
CREATE INDEX "itens_etapa_etapa_id_idx" ON "itens_etapa"("etapa_id");

-- CreateIndex
CREATE INDEX "formulario_modelos_codigo_idx" ON "formulario_modelos"("codigo");

-- CreateIndex
CREATE INDEX "formulario_instancias_unidade_id_idx" ON "formulario_instancias"("unidade_id");

-- CreateIndex
CREATE INDEX "nao_conformidades_unidade_id_idx" ON "nao_conformidades"("unidade_id");

-- CreateIndex
CREATE INDEX "nao_conformidades_status_idx" ON "nao_conformidades"("status");

-- CreateIndex
CREATE UNIQUE INDEX "termos_protocolo_key" ON "termos"("protocolo");

-- CreateIndex
CREATE INDEX "termos_unidade_id_idx" ON "termos"("unidade_id");

-- AddForeignKey
ALTER TABLE "itens_etapa" ADD CONSTRAINT "itens_etapa_etapa_id_fkey" FOREIGN KEY ("etapa_id") REFERENCES "etapas_unidade"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nao_conformidades" ADD CONSTRAINT "nao_conformidades_instancia_id_fkey" FOREIGN KEY ("instancia_id") REFERENCES "formulario_instancias"("id") ON DELETE SET NULL ON UPDATE CASCADE;

