-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_alocacoes" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "employee_id" TEXT NOT NULL,
    "obra_id" TEXT NOT NULL,
    "papel_na_obra" TEXT NOT NULL DEFAULT 'mao_de_obra',
    "principal" BOOLEAN NOT NULL DEFAULT false,
    "responsavel" BOOLEAN NOT NULL DEFAULT false,
    "data_inicio" TEXT,
    "data_fim" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "alocacoes_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "employees" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "alocacoes_obra_id_fkey" FOREIGN KEY ("obra_id") REFERENCES "obras" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_alocacoes" ("created_at", "data_fim", "data_inicio", "employee_id", "id", "obra_id", "papel_na_obra", "principal", "updated_at") SELECT "created_at", "data_fim", "data_inicio", "employee_id", "id", "obra_id", "papel_na_obra", "principal", "updated_at" FROM "alocacoes";
DROP TABLE "alocacoes";
ALTER TABLE "new_alocacoes" RENAME TO "alocacoes";
CREATE INDEX "alocacoes_employee_id_idx" ON "alocacoes"("employee_id");
CREATE INDEX "alocacoes_obra_id_idx" ON "alocacoes"("obra_id");
CREATE TABLE "new_cycles" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "start_date" TEXT NOT NULL,
    "end_date" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'active',
    "tipo" TEXT NOT NULL DEFAULT 'periodica',
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO "new_cycles" ("created_at", "end_date", "id", "name", "start_date", "status") SELECT "created_at", "end_date", "id", "name", "start_date", "status" FROM "cycles";
DROP TABLE "cycles";
ALTER TABLE "new_cycles" RENAME TO "cycles";
CREATE TABLE "new_evaluations" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "employee_id" TEXT NOT NULL,
    "evaluator_id" TEXT,
    "cycle_id" TEXT,
    "obra_id" TEXT,
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
    CONSTRAINT "evaluations_obra_id_fkey" FOREIGN KEY ("obra_id") REFERENCES "obras" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_evaluations" ("created_at", "cycle_id", "due_date", "employee_id", "evaluator_id", "feedback_date", "id", "opportunities", "status", "strengths", "submitted_at", "type", "updated_at") SELECT "created_at", "cycle_id", "due_date", "employee_id", "evaluator_id", "feedback_date", "id", "opportunities", "status", "strengths", "submitted_at", "type", "updated_at" FROM "evaluations";
DROP TABLE "evaluations";
ALTER TABLE "new_evaluations" RENAME TO "evaluations";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
