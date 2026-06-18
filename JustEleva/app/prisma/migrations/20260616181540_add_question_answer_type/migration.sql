-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_template_questions" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "block_id" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "answer_type" TEXT NOT NULL DEFAULT 'scale',
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "template_questions_block_id_fkey" FOREIGN KEY ("block_id") REFERENCES "evaluation_blocks" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_template_questions" ("block_id", "id", "sort_order", "text") SELECT "block_id", "id", "sort_order", "text" FROM "template_questions";
DROP TABLE "template_questions";
ALTER TABLE "new_template_questions" RENAME TO "template_questions";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
