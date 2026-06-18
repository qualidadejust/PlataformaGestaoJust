-- CreateTable
CREATE TABLE "empresas" (
    "id" TEXT NOT NULL PRIMARY KEY,
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
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "cargos" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "nome" TEXT NOT NULL,
    "descricao" TEXT,
    "nivel" TEXT,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "obras" (
    "id" TEXT NOT NULL PRIMARY KEY,
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
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "obras_empresa_id_fkey" FOREIGN KEY ("empresa_id") REFERENCES "empresas" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "colaboradores" (
    "id" TEXT NOT NULL PRIMARY KEY,
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
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "colaboradores_cargo_id_fkey" FOREIGN KEY ("cargo_id") REFERENCES "cargos" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "colaboradores_empresa_id_fkey" FOREIGN KEY ("empresa_id") REFERENCES "empresas" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "alocacoes" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "colaborador_id" TEXT NOT NULL,
    "obra_id" TEXT NOT NULL,
    "papel_na_obra" TEXT NOT NULL DEFAULT 'mao_de_obra',
    "principal" BOOLEAN NOT NULL DEFAULT false,
    "responsavel" BOOLEAN NOT NULL DEFAULT false,
    "data_inicio" TEXT,
    "data_fim" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "alocacoes_colaborador_id_fkey" FOREIGN KEY ("colaborador_id") REFERENCES "colaboradores" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "alocacoes_obra_id_fkey" FOREIGN KEY ("obra_id") REFERENCES "obras" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "fornecedores" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "nome" TEXT NOT NULL,
    "cnpj" TEXT,
    "contato" TEXT,
    "telefone" TEXT,
    "email" TEXT,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "insumos" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "nome" TEXT NOT NULL,
    "categoria" TEXT NOT NULL DEFAULT 'material',
    "unidade" TEXT NOT NULL DEFAULT 'un',
    "ca" TEXT,
    "validade_dias" INTEGER,
    "descricao" TEXT,
    "fornecedor_id" TEXT,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "insumos_fornecedor_id_fkey" FOREIGN KEY ("fornecedor_id") REFERENCES "fornecedores" ("id") ON DELETE SET NULL ON UPDATE CASCADE
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
CREATE INDEX "alocacoes_colaborador_id_idx" ON "alocacoes"("colaborador_id");

-- CreateIndex
CREATE INDEX "alocacoes_obra_id_idx" ON "alocacoes"("obra_id");

-- CreateIndex
CREATE UNIQUE INDEX "fornecedores_cnpj_key" ON "fornecedores"("cnpj");

-- CreateIndex
CREATE INDEX "insumos_categoria_idx" ON "insumos"("categoria");
