-- CreateTable
CREATE TABLE "employees" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "department" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "admission_date" TEXT,
    "avatar_url" TEXT,
    "is_manager" BOOLEAN NOT NULL DEFAULT false,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "cycles" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "start_date" TEXT NOT NULL,
    "end_date" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'active',
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "evaluations" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "employee_id" TEXT NOT NULL,
    "evaluator_id" TEXT,
    "cycle_id" TEXT,
    "type" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "due_date" TEXT,
    "submitted_at" DATETIME,
    "strengths" TEXT,
    "opportunities" TEXT,
    "feedback_date" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "evaluations_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "employees" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "evaluations_evaluator_id_fkey" FOREIGN KEY ("evaluator_id") REFERENCES "employees" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "evaluations_cycle_id_fkey" FOREIGN KEY ("cycle_id") REFERENCES "cycles" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "evaluation_scores" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "evaluation_id" TEXT NOT NULL,
    "question_id" TEXT NOT NULL,
    "score" TEXT,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "evaluation_scores_evaluation_id_fkey" FOREIGN KEY ("evaluation_id") REFERENCES "evaluations" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "potential_scores" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "evaluation_id" TEXT NOT NULL,
    "question_id" TEXT NOT NULL,
    "score" INTEGER,
    CONSTRAINT "potential_scores_evaluation_id_fkey" FOREIGN KEY ("evaluation_id") REFERENCES "evaluations" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "pdi_plans" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "employee_id" TEXT NOT NULL,
    "cycle_id" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "pdi_plans_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "employees" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "pdi_plans_cycle_id_fkey" FOREIGN KEY ("cycle_id") REFERENCES "cycles" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "pdi_actions" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "pdi_plan_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "deadline" TEXT NOT NULL,
    "resources_needed" TEXT,
    "expected_outcomes" TEXT,
    "related_competency" TEXT,
    "action_type" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "pdi_actions_pdi_plan_id_fkey" FOREIGN KEY ("pdi_plan_id") REFERENCES "pdi_plans" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "feedbacks" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "from_employee_id" TEXT NOT NULL,
    "to_employee_id" TEXT NOT NULL,
    "evaluation_id" TEXT,
    "content" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'recognition',
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "feedbacks_from_employee_id_fkey" FOREIGN KEY ("from_employee_id") REFERENCES "employees" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "feedbacks_to_employee_id_fkey" FOREIGN KEY ("to_employee_id") REFERENCES "employees" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "feedbacks_evaluation_id_fkey" FOREIGN KEY ("evaluation_id") REFERENCES "evaluations" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "evaluation_scores_evaluation_id_question_id_key" ON "evaluation_scores"("evaluation_id", "question_id");

-- CreateIndex
CREATE UNIQUE INDEX "potential_scores_evaluation_id_question_id_key" ON "potential_scores"("evaluation_id", "question_id");
