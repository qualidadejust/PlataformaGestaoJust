-- CreateTable
CREATE TABLE "survey_forms" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "survey_dimensions" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "form_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "survey_dimensions_form_id_fkey" FOREIGN KEY ("form_id") REFERENCES "survey_forms" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "survey_questions" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "dimension_id" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "kind" TEXT NOT NULL DEFAULT 'scale',
    "allow_na" BOOLEAN NOT NULL DEFAULT true,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "survey_questions_dimension_id_fkey" FOREIGN KEY ("dimension_id") REFERENCES "survey_dimensions" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "survey_campaigns" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "revision" TEXT,
    "form_id" TEXT NOT NULL,
    "start_date" TEXT,
    "end_date" TEXT,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "min_n" INTEGER NOT NULL DEFAULT 5,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "survey_campaigns_form_id_fkey" FOREIGN KEY ("form_id") REFERENCES "survey_forms" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "survey_responses" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "campaign_id" TEXT NOT NULL,
    "cost_center" TEXT,
    "source" TEXT NOT NULL DEFAULT 'digital',
    "submitted_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "survey_responses_campaign_id_fkey" FOREIGN KEY ("campaign_id") REFERENCES "survey_campaigns" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "survey_answers" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "response_id" TEXT NOT NULL,
    "question_id" TEXT NOT NULL,
    "score" INTEGER,
    CONSTRAINT "survey_answers_response_id_fkey" FOREIGN KEY ("response_id") REFERENCES "survey_responses" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "survey_imported_results" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "campaign_id" TEXT NOT NULL,
    "question_id" TEXT NOT NULL,
    "cost_center" TEXT NOT NULL,
    "n" INTEGER NOT NULL DEFAULT 0,
    "c5" INTEGER NOT NULL DEFAULT 0,
    "c4" INTEGER NOT NULL DEFAULT 0,
    "c3" INTEGER NOT NULL DEFAULT 0,
    "c2" INTEGER NOT NULL DEFAULT 0,
    "c1" INTEGER NOT NULL DEFAULT 0,
    "media" REAL,
    CONSTRAINT "survey_imported_results_campaign_id_fkey" FOREIGN KEY ("campaign_id") REFERENCES "survey_campaigns" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "survey_comments" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "campaign_id" TEXT NOT NULL,
    "cost_center" TEXT,
    "text" TEXT NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "survey_comments_campaign_id_fkey" FOREIGN KEY ("campaign_id") REFERENCES "survey_campaigns" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "survey_actions" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "campaign_id" TEXT NOT NULL,
    "dimension_title" TEXT NOT NULL,
    "cost_center" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "owner" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "deadline" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "survey_actions_campaign_id_fkey" FOREIGN KEY ("campaign_id") REFERENCES "survey_campaigns" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
