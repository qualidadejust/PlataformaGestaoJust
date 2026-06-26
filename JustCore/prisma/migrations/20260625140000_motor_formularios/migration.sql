-- Motor de formulários (base de cadastro transversal). 4 tabelas novas + FKs/índices.
-- Aditivo: não toca dados existentes.

CREATE TABLE "formulario_tipos" (
    "id" TEXT NOT NULL,
    "codigo" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "sigla" TEXT,
    "descricao" TEXT,
    "categoria" TEXT,
    "titulo_relatorio" TEXT,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "formulario_tipos_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "formulario_tipos_codigo_key" ON "formulario_tipos"("codigo");

CREATE TABLE "formulario_grupos" (
    "id" TEXT NOT NULL,
    "codigo" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "sigla" TEXT,
    "descricao" TEXT,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "formulario_grupos_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "formulario_grupos_codigo_key" ON "formulario_grupos"("codigo");

CREATE TABLE "formulario_modelos" (
    "id" TEXT NOT NULL,
    "codigo" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "descricao" TEXT,
    "cabecalho" TEXT,
    "tipo_id" TEXT,
    "grupo_id" TEXT,
    "escopo" TEXT NOT NULL DEFAULT 'geral',
    "entidade_alvo" TEXT,
    "revisao" TEXT,
    "versao" INTEGER NOT NULL DEFAULT 1,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "publicado" BOOLEAN NOT NULL DEFAULT false,
    "dias_validade" INTEGER,
    "config" TEXT,
    "estrutura" TEXT NOT NULL DEFAULT '[]',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "formulario_modelos_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "formulario_modelos_codigo_idx" ON "formulario_modelos"("codigo");
CREATE INDEX "formulario_modelos_escopo_idx" ON "formulario_modelos"("escopo");
CREATE INDEX "formulario_modelos_tipo_id_idx" ON "formulario_modelos"("tipo_id");

CREATE TABLE "formulario_instancias" (
    "id" TEXT NOT NULL,
    "modelo_id" TEXT NOT NULL,
    "modelo_codigo" TEXT NOT NULL,
    "modelo_versao" INTEGER NOT NULL,
    "escopo" TEXT,
    "entidade_tipo" TEXT,
    "entidade_id" TEXT,
    "entidade_label" TEXT,
    "respostas" TEXT NOT NULL DEFAULT '[]',
    "nota" DOUBLE PRECISION,
    "total_nc" INTEGER NOT NULL DEFAULT 0,
    "resumo" TEXT,
    "autor_id" TEXT,
    "autor_nome" TEXT,
    "assinaturas" TEXT,
    "preenchido_em" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "formulario_instancias_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "formulario_instancias_modelo_id_idx" ON "formulario_instancias"("modelo_id");
CREATE INDEX "formulario_instancias_escopo_idx" ON "formulario_instancias"("escopo");
CREATE INDEX "formulario_instancias_entidade_tipo_entidade_id_idx" ON "formulario_instancias"("entidade_tipo", "entidade_id");

ALTER TABLE "formulario_modelos" ADD CONSTRAINT "formulario_modelos_tipo_id_fkey" FOREIGN KEY ("tipo_id") REFERENCES "formulario_tipos"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "formulario_modelos" ADD CONSTRAINT "formulario_modelos_grupo_id_fkey" FOREIGN KEY ("grupo_id") REFERENCES "formulario_grupos"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "formulario_instancias" ADD CONSTRAINT "formulario_instancias_modelo_id_fkey" FOREIGN KEY ("modelo_id") REFERENCES "formulario_modelos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
