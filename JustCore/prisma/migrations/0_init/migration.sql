-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateTable
CREATE TABLE "empresas" (
    "id" TEXT NOT NULL,
    "razao_social" TEXT NOT NULL,
    "nome_fantasia" TEXT,
    "cnpj" TEXT,
    "inscricao_estadual" TEXT,
    "endereco" TEXT,
    "cidade" TEXT,
    "uf" TEXT,
    "telefone" TEXT,
    "email" TEXT,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "empresas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cargos" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "descricao" TEXT,
    "nivel" TEXT,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cargos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "obras" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "cost_center" TEXT,
    "tipo" TEXT NOT NULL DEFAULT 'obra',
    "status" TEXT NOT NULL DEFAULT 'ativa',
    "empresa_id" TEXT,
    "endereco" TEXT,
    "cidade" TEXT,
    "uf" TEXT,
    "data_inicio" TEXT,
    "data_fim" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "obras_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "colaboradores" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "matricula" TEXT,
    "cpf" TEXT,
    "rg" TEXT,
    "data_nascimento" TEXT,
    "data_admissao" TEXT,
    "data_demissao" TEXT,
    "email" TEXT,
    "telefone" TEXT,
    "cargo_id" TEXT,
    "empresa_id" TEXT,
    "setor" TEXT,
    "is_lideranca" BOOLEAN NOT NULL DEFAULT false,
    "status" TEXT NOT NULL DEFAULT 'ativo',
    "avatar_url" TEXT,
    "pis" TEXT,
    "sexo" TEXT,
    "estado_civil" TEXT,
    "endereco" TEXT,
    "numero" TEXT,
    "cep" TEXT,
    "rg_emissor" TEXT,
    "rg_uf" TEXT,
    "situacao" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "colaboradores_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "biometrias" (
    "id" TEXT NOT NULL,
    "colaborador_id" TEXT NOT NULL,
    "dedo" TEXT,
    "template" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "biometrias_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "alocacoes" (
    "id" TEXT NOT NULL,
    "colaborador_id" TEXT NOT NULL,
    "obra_id" TEXT NOT NULL,
    "papel_na_obra" TEXT NOT NULL DEFAULT 'mao_de_obra',
    "principal" BOOLEAN NOT NULL DEFAULT false,
    "responsavel" BOOLEAN NOT NULL DEFAULT false,
    "data_inicio" TEXT,
    "data_fim" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "alocacoes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fornecedores" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "cnpj" TEXT,
    "contato" TEXT,
    "telefone" TEXT,
    "email" TEXT,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "fornecedores_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "setores" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "descricao" TEXT,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "setores_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "indicadores" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "descricao" TEXT,
    "setor" TEXT,
    "unidade" TEXT,
    "direcao" TEXT NOT NULL DEFAULT 'maior',
    "meta" TEXT,
    "periodicidade" TEXT,
    "formula" TEXT,
    "responsavel" TEXT,
    "cargo_alvo" TEXT,
    "acumula" BOOLEAN NOT NULL DEFAULT false,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "indicadores_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "custos_cargo" (
    "id" TEXT NOT NULL,
    "cargo" TEXT NOT NULL,
    "competencia" TEXT NOT NULL,
    "salario_base" DOUBLE PRECISION,
    "custo_mensal" DOUBLE PRECISION NOT NULL,
    "jornada_horas" INTEGER NOT NULL DEFAULT 220,
    "fonte" TEXT,
    "observacao" TEXT,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "custos_cargo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "insumos" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "categoria" TEXT NOT NULL DEFAULT 'material',
    "unidade" TEXT NOT NULL DEFAULT 'un',
    "ca" TEXT,
    "cod_sienge" TEXT,
    "validade_dias" INTEGER,
    "alerta_dias" INTEGER,
    "tipo_controle" TEXT NOT NULL DEFAULT 'prazo',
    "inspecionavel" BOOLEAN NOT NULL DEFAULT false,
    "descricao" TEXT,
    "fornecedor_id" TEXT,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "insumos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "veiculos" (
    "id" TEXT NOT NULL,
    "placa" TEXT,
    "identificacao" TEXT,
    "modelo" TEXT,
    "marca" TEXT,
    "tipo" TEXT NOT NULL DEFAULT 'carro',
    "ano" INTEGER,
    "combustivel" TEXT,
    "km_atual" INTEGER,
    "empresa_id" TEXT,
    "status" TEXT NOT NULL DEFAULT 'ativo',
    "observacao" TEXT,
    "fipe_codigo" TEXT,
    "valor_fipe" DOUBLE PRECISION,
    "valor_aquisicao" DOUBLE PRECISION,
    "valor_residual" DOUBLE PRECISION,
    "vida_util_anos" INTEGER,
    "consumo_kml" DOUBLE PRECISION,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "veiculos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tipos_documento" (
    "id" TEXT NOT NULL,
    "codigo" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "entidade_tipo" TEXT NOT NULL,
    "natureza" TEXT NOT NULL DEFAULT 'registro',
    "setor" TEXT,
    "sensivel_padrao" BOOLEAN NOT NULL DEFAULT false,
    "versionavel" BOOLEAN NOT NULL DEFAULT false,
    "vence" BOOLEAN NOT NULL DEFAULT false,
    "retencao_dias" INTEGER,
    "obrigatorio" BOOLEAN NOT NULL DEFAULT false,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tipos_documento_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "documentos" (
    "id" TEXT NOT NULL,
    "entidade_tipo" TEXT NOT NULL,
    "entidade_id" TEXT NOT NULL,
    "categoria" TEXT NOT NULL,
    "tipo_codigo" TEXT,
    "natureza" TEXT NOT NULL DEFAULT 'registro',
    "setor" TEXT,
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
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "documentos_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "empresas_cnpj_key" ON "empresas"("cnpj");

-- CreateIndex
CREATE UNIQUE INDEX "cargos_nome_key" ON "cargos"("nome");

-- CreateIndex
CREATE UNIQUE INDEX "obras_cost_center_key" ON "obras"("cost_center");

-- CreateIndex
CREATE UNIQUE INDEX "colaboradores_matricula_key" ON "colaboradores"("matricula");

-- CreateIndex
CREATE UNIQUE INDEX "colaboradores_cpf_key" ON "colaboradores"("cpf");

-- CreateIndex
CREATE INDEX "colaboradores_cargo_id_idx" ON "colaboradores"("cargo_id");

-- CreateIndex
CREATE INDEX "colaboradores_empresa_id_idx" ON "colaboradores"("empresa_id");

-- CreateIndex
CREATE INDEX "biometrias_colaborador_id_idx" ON "biometrias"("colaborador_id");

-- CreateIndex
CREATE INDEX "alocacoes_colaborador_id_idx" ON "alocacoes"("colaborador_id");

-- CreateIndex
CREATE INDEX "alocacoes_obra_id_idx" ON "alocacoes"("obra_id");

-- CreateIndex
CREATE UNIQUE INDEX "fornecedores_cnpj_key" ON "fornecedores"("cnpj");

-- CreateIndex
CREATE UNIQUE INDEX "setores_nome_key" ON "setores"("nome");

-- CreateIndex
CREATE INDEX "custos_cargo_cargo_idx" ON "custos_cargo"("cargo");

-- CreateIndex
CREATE UNIQUE INDEX "custos_cargo_cargo_competencia_key" ON "custos_cargo"("cargo", "competencia");

-- CreateIndex
CREATE INDEX "insumos_categoria_idx" ON "insumos"("categoria");

-- CreateIndex
CREATE UNIQUE INDEX "veiculos_placa_key" ON "veiculos"("placa");

-- CreateIndex
CREATE UNIQUE INDEX "tipos_documento_codigo_key" ON "tipos_documento"("codigo");

-- CreateIndex
CREATE INDEX "tipos_documento_entidade_tipo_idx" ON "tipos_documento"("entidade_tipo");

-- CreateIndex
CREATE INDEX "documentos_entidade_tipo_entidade_id_idx" ON "documentos"("entidade_tipo", "entidade_id");

-- CreateIndex
CREATE INDEX "documentos_categoria_idx" ON "documentos"("categoria");

-- CreateIndex
CREATE INDEX "documentos_grupo_id_idx" ON "documentos"("grupo_id");

-- CreateIndex
CREATE INDEX "documentos_tipo_codigo_idx" ON "documentos"("tipo_codigo");

-- CreateIndex
CREATE INDEX "documentos_natureza_idx" ON "documentos"("natureza");

-- CreateIndex
CREATE INDEX "documentos_setor_idx" ON "documentos"("setor");

-- AddForeignKey
ALTER TABLE "obras" ADD CONSTRAINT "obras_empresa_id_fkey" FOREIGN KEY ("empresa_id") REFERENCES "empresas"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "colaboradores" ADD CONSTRAINT "colaboradores_cargo_id_fkey" FOREIGN KEY ("cargo_id") REFERENCES "cargos"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "colaboradores" ADD CONSTRAINT "colaboradores_empresa_id_fkey" FOREIGN KEY ("empresa_id") REFERENCES "empresas"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "biometrias" ADD CONSTRAINT "biometrias_colaborador_id_fkey" FOREIGN KEY ("colaborador_id") REFERENCES "colaboradores"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "alocacoes" ADD CONSTRAINT "alocacoes_colaborador_id_fkey" FOREIGN KEY ("colaborador_id") REFERENCES "colaboradores"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "alocacoes" ADD CONSTRAINT "alocacoes_obra_id_fkey" FOREIGN KEY ("obra_id") REFERENCES "obras"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "insumos" ADD CONSTRAINT "insumos_fornecedor_id_fkey" FOREIGN KEY ("fornecedor_id") REFERENCES "fornecedores"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "veiculos" ADD CONSTRAINT "veiculos_empresa_id_fkey" FOREIGN KEY ("empresa_id") REFERENCES "empresas"("id") ON DELETE SET NULL ON UPDATE CASCADE;

