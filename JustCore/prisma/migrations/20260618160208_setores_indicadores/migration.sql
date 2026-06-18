-- CreateTable
CREATE TABLE "setores" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "nome" TEXT NOT NULL,
    "descricao" TEXT,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "indicadores" (
    "id" TEXT NOT NULL PRIMARY KEY,
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
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "setores_nome_key" ON "setores"("nome");
