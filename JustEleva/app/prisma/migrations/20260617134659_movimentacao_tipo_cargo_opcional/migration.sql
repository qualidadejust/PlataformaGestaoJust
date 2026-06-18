-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_movimentacoes" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "employee_id" TEXT NOT NULL,
    "tipo" TEXT NOT NULL DEFAULT 'promocao',
    "cargo_atual" TEXT,
    "cargo_pretendido" TEXT,
    "motivo" TEXT,
    "status" TEXT NOT NULL DEFAULT 'solicitada',
    "decisao" TEXT,
    "justificativa" TEXT,
    "decided_at" DATETIME,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "movimentacoes_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "employees" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_movimentacoes" ("cargo_atual", "cargo_pretendido", "created_at", "decided_at", "decisao", "employee_id", "id", "justificativa", "motivo", "status", "updated_at") SELECT "cargo_atual", "cargo_pretendido", "created_at", "decided_at", "decisao", "employee_id", "id", "justificativa", "motivo", "status", "updated_at" FROM "movimentacoes";
DROP TABLE "movimentacoes";
ALTER TABLE "new_movimentacoes" RENAME TO "movimentacoes";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
