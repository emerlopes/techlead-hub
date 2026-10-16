-- CreateEnum
CREATE TYPE "TeamStatus" AS ENUM ('ACTIVE', 'INACTIVE');

-- CreateEnum
CREATE TYPE "ProjectStatus" AS ENUM ('ACTIVE', 'PAUSED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "DeveloperStatus" AS ENUM ('ACTIVE', 'INACTIVE');

-- CreateEnum
CREATE TYPE "TaskType" AS ENUM ('TECHNICAL', 'FOLLOW_UP', 'DECISION', 'MEETING', 'PLANNING', 'REVIEW', 'INVESTIGATION', 'OTHER');

-- CreateEnum
CREATE TYPE "TaskStatus" AS ENUM ('TODO', 'IN_PROGRESS', 'BLOCKED', 'DONE', 'CANCELLED');

-- CreateEnum
CREATE TYPE "TaskPriority" AS ENUM ('CRITICAL', 'HIGH', 'MEDIUM', 'LOW');

-- CreateTable
CREATE TABLE "teams" (
    "id" UUID NOT NULL,
    "workspace_id" UUID NOT NULL,
    "name" VARCHAR(80) NOT NULL,
    "code" VARCHAR(12) NOT NULL,
    "description" VARCHAR(500),
    "status" "TeamStatus" NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "teams_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "projects" (
    "id" UUID NOT NULL,
    "workspace_id" UUID NOT NULL,
    "name" VARCHAR(80) NOT NULL,
    "code" VARCHAR(12) NOT NULL,
    "description" VARCHAR(500),
    "status" "ProjectStatus" NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "projects_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "team_projects" (
    "id" UUID NOT NULL,
    "team_id" UUID NOT NULL,
    "project_id" UUID NOT NULL,
    "started_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ended_at" TIMESTAMPTZ(3),
    "is_primary" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "team_projects_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "developers" (
    "id" UUID NOT NULL,
    "workspace_id" UUID NOT NULL,
    "name" VARCHAR(80) NOT NULL,
    "email" VARCHAR(254),
    "role_description" VARCHAR(120),
    "status" "DeveloperStatus" NOT NULL DEFAULT 'ACTIVE',
    "notes" VARCHAR(2000),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "developers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "team_developers" (
    "id" UUID NOT NULL,
    "team_id" UUID NOT NULL,
    "developer_id" UUID NOT NULL,
    "started_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ended_at" TIMESTAMPTZ(3),

    CONSTRAINT "team_developers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tasks" (
    "id" UUID NOT NULL,
    "workspace_id" UUID NOT NULL,
    "title" VARCHAR(200) NOT NULL,
    "description" VARCHAR(5000),
    "type" "TaskType" NOT NULL DEFAULT 'OTHER',
    "status" "TaskStatus" NOT NULL DEFAULT 'TODO',
    "priority" "TaskPriority" NOT NULL DEFAULT 'MEDIUM',
    "due_date" DATE,
    "next_action" VARCHAR(300),
    "blocked_reason" VARCHAR(500),
    "estimated_hours" DECIMAL(7,2),
    "actual_hours" DECIMAL(7,2),
    "completed_at" TIMESTAMPTZ(3),
    "cancelled_at" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "tasks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "task_teams" (
    "task_id" UUID NOT NULL,
    "team_id" UUID NOT NULL,

    CONSTRAINT "task_teams_pkey" PRIMARY KEY ("task_id","team_id")
);

-- CreateTable
CREATE TABLE "task_projects" (
    "task_id" UUID NOT NULL,
    "project_id" UUID NOT NULL,

    CONSTRAINT "task_projects_pkey" PRIMARY KEY ("task_id","project_id")
);

-- CreateTable
CREATE TABLE "focus_queue_items" (
    "id" UUID NOT NULL,
    "workspace_id" UUID NOT NULL,
    "task_id" UUID NOT NULL,
    "position" INTEGER NOT NULL,
    "is_primary" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "focus_queue_items_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "teams_workspace_id_code_key" ON "teams"("workspace_id", "code");

-- CreateIndex
CREATE UNIQUE INDEX "projects_workspace_id_code_key" ON "projects"("workspace_id", "code");

-- CreateIndex
CREATE INDEX "team_projects_team_id_idx" ON "team_projects"("team_id");

-- CreateIndex
CREATE INDEX "team_projects_project_id_idx" ON "team_projects"("project_id");

-- CreateIndex
CREATE INDEX "developers_workspace_id_status_idx" ON "developers"("workspace_id", "status");

-- CreateIndex
CREATE INDEX "team_developers_team_id_idx" ON "team_developers"("team_id");

-- CreateIndex
CREATE INDEX "team_developers_developer_id_idx" ON "team_developers"("developer_id");

-- CreateIndex
CREATE INDEX "tasks_workspace_id_status_due_date_idx" ON "tasks"("workspace_id", "status", "due_date");

-- CreateIndex
CREATE INDEX "task_teams_team_id_idx" ON "task_teams"("team_id");

-- CreateIndex
CREATE INDEX "task_projects_project_id_idx" ON "task_projects"("project_id");

-- CreateIndex
CREATE UNIQUE INDEX "focus_queue_items_task_id_key" ON "focus_queue_items"("task_id");

-- CreateIndex
CREATE UNIQUE INDEX "focus_queue_items_workspace_id_position_key" ON "focus_queue_items"("workspace_id", "position");

-- AddForeignKey
ALTER TABLE "teams" ADD CONSTRAINT "teams_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "projects" ADD CONSTRAINT "projects_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "team_projects" ADD CONSTRAINT "team_projects_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "teams"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "team_projects" ADD CONSTRAINT "team_projects_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "developers" ADD CONSTRAINT "developers_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "team_developers" ADD CONSTRAINT "team_developers_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "teams"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "team_developers" ADD CONSTRAINT "team_developers_developer_id_fkey" FOREIGN KEY ("developer_id") REFERENCES "developers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "task_teams" ADD CONSTRAINT "task_teams_task_id_fkey" FOREIGN KEY ("task_id") REFERENCES "tasks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "task_teams" ADD CONSTRAINT "task_teams_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "teams"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "task_projects" ADD CONSTRAINT "task_projects_task_id_fkey" FOREIGN KEY ("task_id") REFERENCES "tasks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "task_projects" ADD CONSTRAINT "task_projects_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "focus_queue_items" ADD CONSTRAINT "focus_queue_items_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "focus_queue_items" ADD CONSTRAINT "focus_queue_items_task_id_fkey" FOREIGN KEY ("task_id") REFERENCES "tasks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Constraints essenciais (§35.7) não representáveis no schema Prisma.
ALTER TABLE "teams" ADD CONSTRAINT "teams_version_positive" CHECK ("version" >= 1);
ALTER TABLE "teams" ADD CONSTRAINT "teams_code_format" CHECK ("code" ~ '^[A-Z0-9][A-Z0-9_-]{1,11}$');
ALTER TABLE "projects" ADD CONSTRAINT "projects_version_positive" CHECK ("version" >= 1);
ALTER TABLE "projects" ADD CONSTRAINT "projects_code_format" CHECK ("code" ~ '^[A-Z0-9][A-Z0-9_-]{1,11}$');
ALTER TABLE "developers" ADD CONSTRAINT "developers_version_positive" CHECK ("version" >= 1);
ALTER TABLE "developers" ADD CONSTRAINT "developers_email_lowercase" CHECK ("email" = lower("email"));
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_version_positive" CHECK ("version" >= 1);
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_estimated_hours_non_negative" CHECK ("estimated_hours" >= 0);
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_actual_hours_non_negative" CHECK ("actual_hours" >= 0);

-- Períodos válidos (§35.7).
ALTER TABLE "team_projects" ADD CONSTRAINT "team_projects_valid_period" CHECK ("ended_at" IS NULL OR "ended_at" >= "started_at");
ALTER TABLE "team_developers" ADD CONSTRAINT "team_developers_valid_period" CHECK ("ended_at" IS NULL OR "ended_at" >= "started_at");

-- Uma associação ativa entre o mesmo par não é duplicada (§9.2); encerradas ficam no histórico.
CREATE UNIQUE INDEX "team_projects_active_unique" ON "team_projects" ("team_id", "project_id") WHERE "ended_at" IS NULL;
CREATE UNIQUE INDEX "team_developers_active_unique" ON "team_developers" ("team_id", "developer_id") WHERE "ended_at" IS NULL;

-- Fila de foco: até três posições (RN-003) e no máximo um foco principal (RN-002).
ALTER TABLE "focus_queue_items" ADD CONSTRAINT "focus_queue_items_position_range" CHECK ("position" BETWEEN 0 AND 2);
CREATE UNIQUE INDEX "focus_queue_items_single_primary" ON "focus_queue_items" ("workspace_id") WHERE "is_primary";
