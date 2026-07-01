-- Migration: backbone Local + Servico + Tarefa (ACL Prevision)
-- Gerada manualmente em 2026-06-30

-- 1. Campos adicionados ao model Obra
ALTER TABLE "obras" ADD COLUMN IF NOT EXISTS "sienge_id"   TEXT;
ALTER TABLE "obras" ADD COLUMN IF NOT EXISTS "tipo_fiscal" TEXT NOT NULL DEFAULT 'MESMO_CNPJ';

CREATE UNIQUE INDEX IF NOT EXISTS "obras_sienge_id_key" ON "obras"("sienge_id");

-- 2. Catálogo de serviços (chave: sigla_prancha global)
CREATE TABLE IF NOT EXISTS "servicos" (
    "id"               TEXT NOT NULL,
    "nome"             TEXT NOT NULL,
    "sigla_prancha"    TEXT NOT NULL,
    "codigo_prevision" TEXT,
    "codigo_sienge"    TEXT,
    "ativo"            BOOLEAN NOT NULL DEFAULT true,
    "created_at"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "servicos_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "servicos_sigla_prancha_key" ON "servicos"("sigla_prancha");

-- 3. LBS — locais de obra (chave: obra_id + zona + pavimento)
CREATE TABLE IF NOT EXISTS "locais" (
    "id"          TEXT NOT NULL,
    "obra_id"     TEXT NOT NULL,
    "zona"        TEXT NOT NULL,
    "pavimento"   TEXT NOT NULL,
    "parte"       TEXT,
    "nome"        TEXT,
    "external_id" TEXT,
    "origem"      TEXT NOT NULL DEFAULT 'PREVISION',
    "created_at"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "locais_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "locais_obra_id_zona_pavimento_key"
    ON "locais"("obra_id", "zona", "pavimento");
CREATE INDEX IF NOT EXISTS "locais_obra_id_idx" ON "locais"("obra_id");

ALTER TABLE "locais"
    ADD CONSTRAINT "locais_obra_id_fkey"
    FOREIGN KEY ("obra_id") REFERENCES "obras"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- 4. Tarefas (célula Obra × Local × Serviço)
CREATE TABLE IF NOT EXISTS "tarefas" (
    "id"                TEXT NOT NULL,
    "obra_id"           TEXT NOT NULL,
    "local_id"          TEXT NOT NULL,
    "servico_id"        TEXT NOT NULL,
    "external_id"       TEXT NOT NULL,
    "origem"            TEXT NOT NULL DEFAULT 'PREVISION',
    "job"               TEXT,
    "baseline_inicio"   TIMESTAMP(3),
    "baseline_fim"      TIMESTAMP(3),
    "real_inicio"       TIMESTAMP(3),
    "real_fim"          TIMESTAMP(3),
    "duracao"           DOUBLE PRECISION,
    "critico"           BOOLEAN NOT NULL DEFAULT false,
    "avanco_pct"        DOUBLE PRECISION NOT NULL DEFAULT 0,
    "predecessores"     TEXT,
    "successores"       TEXT,
    "material_resources" TEXT,
    "created_at"        TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at"        TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tarefas_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "tarefas_external_id_key" ON "tarefas"("external_id");
CREATE INDEX IF NOT EXISTS "tarefas_obra_id_idx"    ON "tarefas"("obra_id");
CREATE INDEX IF NOT EXISTS "tarefas_local_id_idx"   ON "tarefas"("local_id");
CREATE INDEX IF NOT EXISTS "tarefas_servico_id_idx" ON "tarefas"("servico_id");

ALTER TABLE "tarefas"
    ADD CONSTRAINT "tarefas_obra_id_fkey"
    FOREIGN KEY ("obra_id") REFERENCES "obras"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "tarefas"
    ADD CONSTRAINT "tarefas_local_id_fkey"
    FOREIGN KEY ("local_id") REFERENCES "locais"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "tarefas"
    ADD CONSTRAINT "tarefas_servico_id_fkey"
    FOREIGN KEY ("servico_id") REFERENCES "servicos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
