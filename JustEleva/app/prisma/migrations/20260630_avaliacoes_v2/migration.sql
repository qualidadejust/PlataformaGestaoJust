-- avaliacoes_v2: justificativa por pergunta, reflexões do colaborador, consenso substituindo calibração

-- EvaluationScore: campo de justificativa de texto obrigatória por resposta
ALTER TABLE "evaluation_scores" ADD COLUMN "justification" TEXT;

-- Evaluation: reflexões do colaborador (autoavaliação — Q50, Q51, Q52)
ALTER TABLE "evaluations" ADD COLUMN "reflection_strengths"    TEXT;
ALTER TABLE "evaluations" ADD COLUMN "reflection_difficulties" TEXT;
ALTER TABLE "evaluations" ADD COLUMN "reflection_competencies" TEXT;

-- Calibration: remove nota calibrada, adiciona data da reunião de consenso
ALTER TABLE "calibrations" DROP COLUMN IF EXISTS "score";
ALTER TABLE "calibrations" ADD COLUMN "consensus_date" TEXT;

-- Limpar dados de teste
TRUNCATE TABLE "potential_scores"    CASCADE;
TRUNCATE TABLE "evaluation_scores"   CASCADE;
TRUNCATE TABLE "calibrations"        CASCADE;
TRUNCATE TABLE "pdi_actions"         CASCADE;
TRUNCATE TABLE "pdi_plans"           CASCADE;
TRUNCATE TABLE "feedbacks"           CASCADE;
TRUNCATE TABLE "evaluations"         CASCADE;
