-- CreateTable
CREATE TABLE "movimentacoes" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "employee_id" TEXT NOT NULL,
    "cargo_atual" TEXT,
    "cargo_pretendido" TEXT NOT NULL,
    "motivo" TEXT,
    "status" TEXT NOT NULL DEFAULT 'solicitada',
    "decisao" TEXT,
    "justificativa" TEXT,
    "decided_at" DATETIME,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "movimentacoes_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "employees" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_access_tokens" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "token" TEXT NOT NULL,
    "employee_id" TEXT NOT NULL,
    "cycle_id" TEXT,
    "movimentacao_id" TEXT,
    "expires_at" DATETIME,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "access_tokens_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "employees" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "access_tokens_cycle_id_fkey" FOREIGN KEY ("cycle_id") REFERENCES "cycles" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "access_tokens_movimentacao_id_fkey" FOREIGN KEY ("movimentacao_id") REFERENCES "movimentacoes" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_access_tokens" ("created_at", "cycle_id", "employee_id", "expires_at", "id", "token") SELECT "created_at", "cycle_id", "employee_id", "expires_at", "id", "token" FROM "access_tokens";
DROP TABLE "access_tokens";
ALTER TABLE "new_access_tokens" RENAME TO "access_tokens";
CREATE UNIQUE INDEX "access_tokens_token_key" ON "access_tokens"("token");
CREATE UNIQUE INDEX "access_tokens_employee_id_cycle_id_key" ON "access_tokens"("employee_id", "cycle_id");
CREATE TABLE "new_evaluations" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "employee_id" TEXT NOT NULL,
    "evaluator_id" TEXT,
    "cycle_id" TEXT,
    "obra_id" TEXT,
    "movimentacao_id" TEXT,
    "type" TEXT NOT NULL,
    "origem" TEXT NOT NULL DEFAULT 'manual',
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
    CONSTRAINT "evaluations_cycle_id_fkey" FOREIGN KEY ("cycle_id") REFERENCES "cycles" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "evaluations_obra_id_fkey" FOREIGN KEY ("obra_id") REFERENCES "obras" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "evaluations_movimentacao_id_fkey" FOREIGN KEY ("movimentacao_id") REFERENCES "movimentacoes" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_evaluations" ("created_at", "cycle_id", "due_date", "employee_id", "evaluator_id", "feedback_date", "id", "obra_id", "opportunities", "origem", "status", "strengths", "submitted_at", "type", "updated_at") SELECT "created_at", "cycle_id", "due_date", "employee_id", "evaluator_id", "feedback_date", "id", "obra_id", "opportunities", "origem", "status", "strengths", "submitted_at", "type", "updated_at" FROM "evaluations";
DROP TABLE "evaluations";
ALTER TABLE "new_evaluations" RENAME TO "evaluations";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
