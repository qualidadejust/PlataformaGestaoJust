-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateTable
CREATE TABLE "employees" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "department" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "admission_date" TEXT,
    "avatar_url" TEXT,
    "is_manager" BOOLEAN NOT NULL DEFAULT false,
    "cost_center" TEXT,
    "template_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "employees_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "obras" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "cost_center" TEXT,
    "tipo" TEXT NOT NULL DEFAULT 'obra',
    "status" TEXT NOT NULL DEFAULT 'ativa',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "obras_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "alocacoes" (
    "id" TEXT NOT NULL,
    "employee_id" TEXT NOT NULL,
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
CREATE TABLE "evaluation_templates" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "scale_max" INTEGER NOT NULL DEFAULT 5,
    "applies_to" TEXT NOT NULL DEFAULT 'default',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "evaluation_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "evaluation_blocks" (
    "id" TEXT NOT NULL,
    "template_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "manager_only" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "evaluation_blocks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "template_questions" (
    "id" TEXT NOT NULL,
    "block_id" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "answer_type" TEXT NOT NULL DEFAULT 'scale',
    "sort_order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "template_questions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cycles" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "start_date" TEXT NOT NULL,
    "end_date" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'active',
    "tipo" TEXT NOT NULL DEFAULT 'periodica',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "cycles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "access_tokens" (
    "id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "employee_id" TEXT NOT NULL,
    "cycle_id" TEXT,
    "movimentacao_id" TEXT,
    "expires_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "access_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "indicadores" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "descricao" TEXT,
    "unidade" TEXT,
    "direcao" TEXT NOT NULL DEFAULT 'maior',
    "cargo_alvo" TEXT,
    "setor" TEXT,
    "formula" TEXT,
    "meta" TEXT,
    "periodicidade" TEXT,
    "responsavel" TEXT,
    "acumula" BOOLEAN NOT NULL DEFAULT false,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "indicadores_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "indicador_realizacoes" (
    "id" TEXT NOT NULL,
    "indicador_id" TEXT NOT NULL,
    "employee_id" TEXT,
    "periodo" TEXT NOT NULL,
    "valor" TEXT,
    "valor_num" DOUBLE PRECISION,
    "observacao" TEXT,
    "evidencia_url" TEXT,
    "lancado_por" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "indicador_realizacoes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "indicador_atribuicoes" (
    "id" TEXT NOT NULL,
    "indicador_id" TEXT NOT NULL,
    "employee_id" TEXT NOT NULL,
    "meta" TEXT,
    "peso" INTEGER NOT NULL DEFAULT 1,
    "fonte" TEXT NOT NULL DEFAULT 'avaliador',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "indicador_atribuicoes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "movimentacoes" (
    "id" TEXT NOT NULL,
    "employee_id" TEXT NOT NULL,
    "tipo" TEXT NOT NULL DEFAULT 'promocao',
    "cargo_atual" TEXT,
    "cargo_pretendido" TEXT,
    "motivo" TEXT,
    "status" TEXT NOT NULL DEFAULT 'solicitada',
    "decisao" TEXT,
    "justificativa" TEXT,
    "decided_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "movimentacoes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "evaluations" (
    "id" TEXT NOT NULL,
    "employee_id" TEXT NOT NULL,
    "evaluator_id" TEXT,
    "cycle_id" TEXT,
    "obra_id" TEXT,
    "movimentacao_id" TEXT,
    "type" TEXT NOT NULL,
    "origem" TEXT NOT NULL DEFAULT 'manual',
    "status" TEXT NOT NULL DEFAULT 'pending',
    "due_date" TEXT,
    "submitted_at" TIMESTAMP(3),
    "strengths" TEXT,
    "opportunities" TEXT,
    "feedback_date" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "evaluations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "evaluation_scores" (
    "id" TEXT NOT NULL,
    "evaluation_id" TEXT NOT NULL,
    "question_id" TEXT NOT NULL,
    "score" TEXT,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "evaluation_scores_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "potential_scores" (
    "id" TEXT NOT NULL,
    "evaluation_id" TEXT NOT NULL,
    "question_id" TEXT NOT NULL,
    "score" INTEGER,

    CONSTRAINT "potential_scores_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pdi_plans" (
    "id" TEXT NOT NULL,
    "employee_id" TEXT NOT NULL,
    "cycle_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pdi_plans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pdi_actions" (
    "id" TEXT NOT NULL,
    "pdi_plan_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "deadline" TEXT NOT NULL,
    "resources_needed" TEXT,
    "expected_outcomes" TEXT,
    "related_competency" TEXT,
    "action_type" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pdi_actions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "feedbacks" (
    "id" TEXT NOT NULL,
    "from_employee_id" TEXT NOT NULL,
    "to_employee_id" TEXT NOT NULL,
    "evaluation_id" TEXT,
    "content" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'recognition',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "feedbacks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "calibrations" (
    "id" TEXT NOT NULL,
    "employee_id" TEXT NOT NULL,
    "cycle_id" TEXT NOT NULL,
    "score" DOUBLE PRECISION,
    "potential" TEXT,
    "justification" TEXT,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "calibrations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "survey_forms" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "survey_forms_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "survey_dimensions" (
    "id" TEXT NOT NULL,
    "form_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "survey_dimensions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "survey_questions" (
    "id" TEXT NOT NULL,
    "dimension_id" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "kind" TEXT NOT NULL DEFAULT 'scale',
    "allow_na" BOOLEAN NOT NULL DEFAULT true,
    "sort_order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "survey_questions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "survey_campaigns" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "revision" TEXT,
    "form_id" TEXT NOT NULL,
    "start_date" TEXT,
    "end_date" TEXT,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "min_n" INTEGER NOT NULL DEFAULT 5,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "survey_campaigns_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "survey_responses" (
    "id" TEXT NOT NULL,
    "campaign_id" TEXT NOT NULL,
    "cost_center" TEXT,
    "source" TEXT NOT NULL DEFAULT 'digital',
    "submitted_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "survey_responses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "survey_answers" (
    "id" TEXT NOT NULL,
    "response_id" TEXT NOT NULL,
    "question_id" TEXT NOT NULL,
    "score" INTEGER,

    CONSTRAINT "survey_answers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "survey_imported_results" (
    "id" TEXT NOT NULL,
    "campaign_id" TEXT NOT NULL,
    "question_id" TEXT NOT NULL,
    "cost_center" TEXT NOT NULL,
    "n" INTEGER NOT NULL DEFAULT 0,
    "c5" INTEGER NOT NULL DEFAULT 0,
    "c4" INTEGER NOT NULL DEFAULT 0,
    "c3" INTEGER NOT NULL DEFAULT 0,
    "c2" INTEGER NOT NULL DEFAULT 0,
    "c1" INTEGER NOT NULL DEFAULT 0,
    "media" DOUBLE PRECISION,

    CONSTRAINT "survey_imported_results_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "survey_comments" (
    "id" TEXT NOT NULL,
    "campaign_id" TEXT NOT NULL,
    "cost_center" TEXT,
    "text" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "survey_comments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "survey_actions" (
    "id" TEXT NOT NULL,
    "campaign_id" TEXT NOT NULL,
    "dimension_title" TEXT NOT NULL,
    "cost_center" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "owner" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "deadline" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "survey_actions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "obras_cost_center_key" ON "obras"("cost_center");

-- CreateIndex
CREATE INDEX "alocacoes_employee_id_idx" ON "alocacoes"("employee_id");

-- CreateIndex
CREATE INDEX "alocacoes_obra_id_idx" ON "alocacoes"("obra_id");

-- CreateIndex
CREATE UNIQUE INDEX "access_tokens_token_key" ON "access_tokens"("token");

-- CreateIndex
CREATE UNIQUE INDEX "access_tokens_employee_id_cycle_id_key" ON "access_tokens"("employee_id", "cycle_id");

-- CreateIndex
CREATE INDEX "indicador_realizacoes_indicador_id_idx" ON "indicador_realizacoes"("indicador_id");

-- CreateIndex
CREATE UNIQUE INDEX "indicador_realizacoes_indicador_id_employee_id_periodo_key" ON "indicador_realizacoes"("indicador_id", "employee_id", "periodo");

-- CreateIndex
CREATE INDEX "indicador_atribuicoes_employee_id_idx" ON "indicador_atribuicoes"("employee_id");

-- CreateIndex
CREATE UNIQUE INDEX "indicador_atribuicoes_indicador_id_employee_id_key" ON "indicador_atribuicoes"("indicador_id", "employee_id");

-- CreateIndex
CREATE UNIQUE INDEX "evaluation_scores_evaluation_id_question_id_key" ON "evaluation_scores"("evaluation_id", "question_id");

-- CreateIndex
CREATE UNIQUE INDEX "potential_scores_evaluation_id_question_id_key" ON "potential_scores"("evaluation_id", "question_id");

-- CreateIndex
CREATE UNIQUE INDEX "calibrations_employee_id_cycle_id_key" ON "calibrations"("employee_id", "cycle_id");

-- AddForeignKey
ALTER TABLE "employees" ADD CONSTRAINT "employees_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "evaluation_templates"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "alocacoes" ADD CONSTRAINT "alocacoes_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "employees"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "alocacoes" ADD CONSTRAINT "alocacoes_obra_id_fkey" FOREIGN KEY ("obra_id") REFERENCES "obras"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "evaluation_blocks" ADD CONSTRAINT "evaluation_blocks_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "evaluation_templates"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "template_questions" ADD CONSTRAINT "template_questions_block_id_fkey" FOREIGN KEY ("block_id") REFERENCES "evaluation_blocks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "access_tokens" ADD CONSTRAINT "access_tokens_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "employees"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "access_tokens" ADD CONSTRAINT "access_tokens_cycle_id_fkey" FOREIGN KEY ("cycle_id") REFERENCES "cycles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "access_tokens" ADD CONSTRAINT "access_tokens_movimentacao_id_fkey" FOREIGN KEY ("movimentacao_id") REFERENCES "movimentacoes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "indicador_realizacoes" ADD CONSTRAINT "indicador_realizacoes_indicador_id_fkey" FOREIGN KEY ("indicador_id") REFERENCES "indicadores"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "indicador_realizacoes" ADD CONSTRAINT "indicador_realizacoes_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "employees"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "indicador_atribuicoes" ADD CONSTRAINT "indicador_atribuicoes_indicador_id_fkey" FOREIGN KEY ("indicador_id") REFERENCES "indicadores"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "indicador_atribuicoes" ADD CONSTRAINT "indicador_atribuicoes_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "employees"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "movimentacoes" ADD CONSTRAINT "movimentacoes_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "employees"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "evaluations" ADD CONSTRAINT "evaluations_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "employees"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "evaluations" ADD CONSTRAINT "evaluations_evaluator_id_fkey" FOREIGN KEY ("evaluator_id") REFERENCES "employees"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "evaluations" ADD CONSTRAINT "evaluations_cycle_id_fkey" FOREIGN KEY ("cycle_id") REFERENCES "cycles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "evaluations" ADD CONSTRAINT "evaluations_obra_id_fkey" FOREIGN KEY ("obra_id") REFERENCES "obras"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "evaluations" ADD CONSTRAINT "evaluations_movimentacao_id_fkey" FOREIGN KEY ("movimentacao_id") REFERENCES "movimentacoes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "evaluation_scores" ADD CONSTRAINT "evaluation_scores_evaluation_id_fkey" FOREIGN KEY ("evaluation_id") REFERENCES "evaluations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "potential_scores" ADD CONSTRAINT "potential_scores_evaluation_id_fkey" FOREIGN KEY ("evaluation_id") REFERENCES "evaluations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pdi_plans" ADD CONSTRAINT "pdi_plans_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "employees"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pdi_plans" ADD CONSTRAINT "pdi_plans_cycle_id_fkey" FOREIGN KEY ("cycle_id") REFERENCES "cycles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pdi_actions" ADD CONSTRAINT "pdi_actions_pdi_plan_id_fkey" FOREIGN KEY ("pdi_plan_id") REFERENCES "pdi_plans"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "feedbacks" ADD CONSTRAINT "feedbacks_from_employee_id_fkey" FOREIGN KEY ("from_employee_id") REFERENCES "employees"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "feedbacks" ADD CONSTRAINT "feedbacks_to_employee_id_fkey" FOREIGN KEY ("to_employee_id") REFERENCES "employees"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "feedbacks" ADD CONSTRAINT "feedbacks_evaluation_id_fkey" FOREIGN KEY ("evaluation_id") REFERENCES "evaluations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "calibrations" ADD CONSTRAINT "calibrations_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "employees"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "calibrations" ADD CONSTRAINT "calibrations_cycle_id_fkey" FOREIGN KEY ("cycle_id") REFERENCES "cycles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "survey_dimensions" ADD CONSTRAINT "survey_dimensions_form_id_fkey" FOREIGN KEY ("form_id") REFERENCES "survey_forms"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "survey_questions" ADD CONSTRAINT "survey_questions_dimension_id_fkey" FOREIGN KEY ("dimension_id") REFERENCES "survey_dimensions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "survey_campaigns" ADD CONSTRAINT "survey_campaigns_form_id_fkey" FOREIGN KEY ("form_id") REFERENCES "survey_forms"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "survey_responses" ADD CONSTRAINT "survey_responses_campaign_id_fkey" FOREIGN KEY ("campaign_id") REFERENCES "survey_campaigns"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "survey_answers" ADD CONSTRAINT "survey_answers_response_id_fkey" FOREIGN KEY ("response_id") REFERENCES "survey_responses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "survey_imported_results" ADD CONSTRAINT "survey_imported_results_campaign_id_fkey" FOREIGN KEY ("campaign_id") REFERENCES "survey_campaigns"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "survey_comments" ADD CONSTRAINT "survey_comments_campaign_id_fkey" FOREIGN KEY ("campaign_id") REFERENCES "survey_campaigns"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "survey_actions" ADD CONSTRAINT "survey_actions_campaign_id_fkey" FOREIGN KEY ("campaign_id") REFERENCES "survey_campaigns"("id") ON DELETE CASCADE ON UPDATE CASCADE;
