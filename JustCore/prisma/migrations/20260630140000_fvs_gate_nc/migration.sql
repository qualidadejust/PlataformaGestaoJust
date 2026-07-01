-- Fase 1: vincular FormularioModelo ao Servico (para FVS por tipo de serviço)
ALTER TABLE "formulario_modelos" ADD COLUMN IF NOT EXISTS "servico_sigla" TEXT;
CREATE INDEX IF NOT EXISTS "formulario_modelos_servico_sigla_idx" ON "formulario_modelos"("servico_sigla");

-- Fase 3: tabela de override da sequência de qualidade por serviço/obra
CREATE TABLE IF NOT EXISTS "sequencia_qualidade" (
  "id"               TEXT NOT NULL,
  "obra_id"          TEXT,               -- nulo = regra global (vale p/ todas as obras)
  "servico_sigla"    TEXT NOT NULL,      -- serviço que depende
  "depende_de_sigla" TEXT NOT NULL,      -- serviço que deve estar aprovado antes
  "ordem"            INTEGER NOT NULL DEFAULT 0,
  "ativo"            BOOLEAN NOT NULL DEFAULT TRUE,
  "created_at"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "sequencia_qualidade_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "sequencia_qualidade_obra_servico_depende_key"
    UNIQUE ("obra_id", "servico_sigla", "depende_de_sigla")
);
CREATE INDEX IF NOT EXISTS "sequencia_qualidade_servico_sigla_idx" ON "sequencia_qualidade"("servico_sigla");
CREATE INDEX IF NOT EXISTS "sequencia_qualidade_obra_id_idx" ON "sequencia_qualidade"("obra_id");

-- Fase 4: tabela de Não-Conformidades (motor transversal — serve FVS e Vistoria)
CREATE TABLE IF NOT EXISTS "nao_conformidades" (
  "id"                          TEXT NOT NULL,
  "instancia_id"                TEXT NOT NULL,       -- FormularioInstancia que gerou a NC
  "item_ref"                    TEXT NOT NULL,       -- "secao_ordem:item_ordem" (referência à resposta)
  "descricao"                   TEXT NOT NULL,
  "causa"                       TEXT,
  "acao_corretiva"              TEXT,
  "responsavel_id"              TEXT,
  "responsavel_nome"            TEXT,
  "prazo"                       TIMESTAMP(3),
  "severidade"                  TEXT NOT NULL DEFAULT 'media', -- baixa | media | alta | critica
  "status"                      TEXT NOT NULL DEFAULT 'aberta', -- aberta | em_acao | reverificacao | fechada
  "instancia_reverificacao_id"  TEXT,               -- FormularioInstancia da reverificação
  "aberta_em"                   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "fechada_em"                  TIMESTAMP(3),
  "created_at"                  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at"                  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "nao_conformidades_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "nao_conformidades_instancia_id_idx" ON "nao_conformidades"("instancia_id");
CREATE INDEX IF NOT EXISTS "nao_conformidades_status_idx" ON "nao_conformidades"("status");
