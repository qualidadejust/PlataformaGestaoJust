-- CreateTable
CREATE TABLE "evaluation_templates" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "scale_max" INTEGER NOT NULL DEFAULT 5,
    "applies_to" TEXT NOT NULL DEFAULT 'default',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "evaluation_blocks" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "template_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "manager_only" BOOLEAN NOT NULL DEFAULT false,
    CONSTRAINT "evaluation_blocks_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "evaluation_templates" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "template_questions" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "block_id" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "template_questions_block_id_fkey" FOREIGN KEY ("block_id") REFERENCES "evaluation_blocks" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_employees" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "department" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "admission_date" TEXT,
    "avatar_url" TEXT,
    "is_manager" BOOLEAN NOT NULL DEFAULT false,
    "template_id" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "employees_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "evaluation_templates" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_employees" ("admission_date", "avatar_url", "created_at", "department", "email", "id", "is_manager", "name", "phone", "role", "updated_at") SELECT "admission_date", "avatar_url", "created_at", "department", "email", "id", "is_manager", "name", "phone", "role", "updated_at" FROM "employees";
DROP TABLE "employees";
ALTER TABLE "new_employees" RENAME TO "employees";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
