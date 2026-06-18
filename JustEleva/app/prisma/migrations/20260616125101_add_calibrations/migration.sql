-- CreateTable
CREATE TABLE "calibrations" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "employee_id" TEXT NOT NULL,
    "cycle_id" TEXT NOT NULL,
    "score" REAL,
    "potential" TEXT,
    "justification" TEXT,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "calibrations_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "employees" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "calibrations_cycle_id_fkey" FOREIGN KEY ("cycle_id") REFERENCES "cycles" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "calibrations_employee_id_cycle_id_key" ON "calibrations"("employee_id", "cycle_id");
