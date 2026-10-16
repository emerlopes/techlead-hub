-- CreateEnum
CREATE TYPE "WorkItemType" AS ENUM ('STORY', 'BUG', 'TECHNICAL_TASK', 'SPIKE', 'IMPROVEMENT', 'OTHER');

-- CreateEnum
CREATE TYPE "ExecutionStatus" AS ENUM ('NOT_STARTED', 'IN_PROGRESS', 'IN_REVIEW', 'DONE', 'CANCELLED');

-- CreateEnum
CREATE TYPE "RefinementStatus" AS ENUM ('NEEDS_REFINEMENT', 'ANALYZING', 'WAITING_INFORMATION', 'READY', 'CANCELLED');

-- CreateEnum
CREATE TYPE "HealthStatus" AS ENUM ('ON_TRACK', 'AT_RISK', 'DELAYED', 'BLOCKED', 'UNKNOWN');

-- CreateEnum
CREATE TYPE "StatusSource" AS ENUM ('TECH_LEAD', 'DEVELOPER', 'EXTERNAL_TOOL', 'MEETING');

-- CreateEnum
CREATE TYPE "SprintStatus" AS ENUM ('PLANNED', 'ACTIVE', 'CLOSED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "SprintScopeType" AS ENUM ('ORIGINAL', 'ADDED', 'MOVED');

-- CreateEnum
CREATE TYPE "SprintExitReason" AS ENUM ('COMPLETED', 'NOT_COMPLETED', 'MOVED', 'REMOVED');

-- CreateEnum
CREATE TYPE "ReleaseStatus" AS ENUM ('PLANNED', 'IN_PROGRESS', 'RELEASED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "RiskType" AS ENUM ('RISK', 'IMPEDIMENT');

-- CreateEnum
CREATE TYPE "RiskSeverity" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');

-- CreateEnum
CREATE TYPE "RiskProbability" AS ENUM ('LOW', 'MEDIUM', 'HIGH');

-- CreateEnum
CREATE TYPE "RiskStatus" AS ENUM ('OPEN', 'MONITORING', 'RESOLVED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "BlockingLevel" AS ENUM ('FULL', 'PARTIAL');

-- CreateEnum
CREATE TYPE "JournalCategory" AS ENUM ('TECH_DECISION', 'INCIDENT', 'BLOCK', 'UNBLOCK', 'LEARNING', 'SCOPE_CHANGE', 'ACHIEVEMENT', 'RISK', 'GENERAL');

-- CreateTable
CREATE TABLE "external_sources" (
    "id" UUID NOT NULL,
    "workspace_id" UUID NOT NULL,
    "name" VARCHAR(60) NOT NULL,
    "base_url" VARCHAR(500),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "external_sources_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "external_work_items" (
    "id" UUID NOT NULL,
    "workspace_id" UUID NOT NULL,
    "source_id" UUID NOT NULL,
    "external_key" VARCHAR(60) NOT NULL,
    "title" VARCHAR(300) NOT NULL,
    "external_url" VARCHAR(2000),
    "item_type" "WorkItemType" NOT NULL DEFAULT 'STORY',
    "project_id" UUID NOT NULL,
    "execution_status" "ExecutionStatus" NOT NULL DEFAULT 'NOT_STARTED',
    "refinement_status" "RefinementStatus" NOT NULL DEFAULT 'NEEDS_REFINEMENT',
    "notes" VARCHAR(5000),
    "completed_at" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "external_work_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "delivery_trackings" (
    "id" UUID NOT NULL,
    "work_item_id" UUID NOT NULL,
    "executing_team_id" UUID,
    "developer_id" UUID,
    "committed_date" DATE,
    "manual_forecast_date" DATE,
    "health_status" "HealthStatus",
    "remaining_effort_hours" DECIMAL(7,2),
    "last_checked_at" TIMESTAMPTZ(3),
    "status_source" "StatusSource",
    "status_note" VARCHAR(1000),
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "delivery_trackings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "delivery_tracking_history" (
    "id" UUID NOT NULL,
    "delivery_tracking_id" UUID NOT NULL,
    "changed_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actor_user_id" UUID,
    "changed_fields" TEXT[],
    "execution_status" "ExecutionStatus" NOT NULL,
    "refinement_status" "RefinementStatus" NOT NULL,
    "executing_team_id" UUID,
    "developer_id" UUID,
    "committed_date" DATE,
    "manual_forecast_date" DATE,
    "health_status" "HealthStatus",
    "remaining_effort_hours" DECIMAL(7,2),
    "status_note" VARCHAR(1000),

    CONSTRAINT "delivery_tracking_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "task_work_items" (
    "task_id" UUID NOT NULL,
    "work_item_id" UUID NOT NULL,

    CONSTRAINT "task_work_items_pkey" PRIMARY KEY ("task_id","work_item_id")
);

-- CreateTable
CREATE TABLE "sprints" (
    "id" UUID NOT NULL,
    "workspace_id" UUID NOT NULL,
    "team_id" UUID NOT NULL,
    "name" VARCHAR(80) NOT NULL,
    "goal" VARCHAR(1000),
    "start_date" DATE NOT NULL,
    "end_date" DATE NOT NULL,
    "status" "SprintStatus" NOT NULL DEFAULT 'PLANNED',
    "closed_at" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "sprints_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sprint_memberships" (
    "id" UUID NOT NULL,
    "sprint_id" UUID NOT NULL,
    "work_item_id" UUID NOT NULL,
    "entered_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "exited_at" TIMESTAMPTZ(3),
    "scope_type" "SprintScopeType" NOT NULL,
    "exit_reason" "SprintExitReason",

    CONSTRAINT "sprint_memberships_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "releases" (
    "id" UUID NOT NULL,
    "workspace_id" UUID NOT NULL,
    "project_id" UUID NOT NULL,
    "name" VARCHAR(80) NOT NULL,
    "description" VARCHAR(2000),
    "committed_date" DATE,
    "forecast_date" DATE,
    "status" "ReleaseStatus" NOT NULL DEFAULT 'PLANNED',
    "closed_at" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "releases_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "release_memberships" (
    "id" UUID NOT NULL,
    "release_id" UUID NOT NULL,
    "work_item_id" UUID NOT NULL,
    "is_required" BOOLEAN NOT NULL DEFAULT true,
    "added_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "removed_at" TIMESTAMPTZ(3),

    CONSTRAINT "release_memberships_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "release_milestones" (
    "id" UUID NOT NULL,
    "release_id" UUID NOT NULL,
    "name" VARCHAR(120) NOT NULL,
    "target_date" DATE,
    "completed_at" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "release_milestones_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "release_forecast_history" (
    "id" UUID NOT NULL,
    "release_id" UUID NOT NULL,
    "changed_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actor_user_id" UUID,
    "committed_date" DATE,
    "forecast_date" DATE,

    CONSTRAINT "release_forecast_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "refinements" (
    "id" UUID NOT NULL,
    "work_item_id" UUID NOT NULL,
    "intended_sprint_id" UUID,
    "open_questions" VARCHAR(2000),
    "pending_items" VARCHAR(2000),
    "notes" VARCHAR(2000),
    "ready_exception_reason" VARCHAR(1000),
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "refinements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "refinement_check_items" (
    "id" UUID NOT NULL,
    "refinement_id" UUID NOT NULL,
    "label" VARCHAR(120) NOT NULL,
    "position" INTEGER NOT NULL,
    "checked_at" TIMESTAMPTZ(3),

    CONSTRAINT "refinement_check_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "risks" (
    "id" UUID NOT NULL,
    "workspace_id" UUID NOT NULL,
    "title" VARCHAR(200) NOT NULL,
    "description" VARCHAR(5000),
    "type" "RiskType" NOT NULL DEFAULT 'RISK',
    "severity" "RiskSeverity" NOT NULL DEFAULT 'MEDIUM',
    "probability" "RiskProbability",
    "impact" VARCHAR(1000),
    "blocking_level" "BlockingLevel",
    "status" "RiskStatus" NOT NULL DEFAULT 'OPEN',
    "mitigation_plan" VARCHAR(2000),
    "owner" VARCHAR(120),
    "identified_at" DATE NOT NULL,
    "resolved_at" TIMESTAMPTZ(3),
    "resolution_note" VARCHAR(1000),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "risks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "risk_links" (
    "id" UUID NOT NULL,
    "risk_id" UUID NOT NULL,
    "work_item_id" UUID,
    "sprint_id" UUID,
    "release_id" UUID,
    "project_id" UUID,
    "team_id" UUID,
    "task_id" UUID,

    CONSTRAINT "risk_links_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "journal_entries" (
    "id" UUID NOT NULL,
    "workspace_id" UUID NOT NULL,
    "category" "JournalCategory" NOT NULL,
    "description" VARCHAR(5000) NOT NULL,
    "occurred_on" DATE NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "journal_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "journal_links" (
    "id" UUID NOT NULL,
    "entry_id" UUID NOT NULL,
    "team_id" UUID,
    "project_id" UUID,
    "sprint_id" UUID,
    "release_id" UUID,
    "work_item_id" UUID,
    "risk_id" UUID,

    CONSTRAINT "journal_links_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "external_sources_workspace_id_name_key" ON "external_sources"("workspace_id", "name");

-- CreateIndex
CREATE INDEX "external_work_items_workspace_id_project_id_idx" ON "external_work_items"("workspace_id", "project_id");

-- CreateIndex
CREATE INDEX "external_work_items_workspace_id_execution_status_idx" ON "external_work_items"("workspace_id", "execution_status");

-- CreateIndex
CREATE UNIQUE INDEX "external_work_items_source_id_external_key_key" ON "external_work_items"("source_id", "external_key");

-- CreateIndex
CREATE UNIQUE INDEX "delivery_trackings_work_item_id_key" ON "delivery_trackings"("work_item_id");

-- CreateIndex
CREATE INDEX "delivery_trackings_executing_team_id_idx" ON "delivery_trackings"("executing_team_id");

-- CreateIndex
CREATE INDEX "delivery_trackings_developer_id_idx" ON "delivery_trackings"("developer_id");

-- CreateIndex
CREATE INDEX "delivery_tracking_history_delivery_tracking_id_changed_at_idx" ON "delivery_tracking_history"("delivery_tracking_id", "changed_at");

-- CreateIndex
CREATE INDEX "task_work_items_work_item_id_idx" ON "task_work_items"("work_item_id");

-- CreateIndex
CREATE INDEX "sprints_team_id_start_date_idx" ON "sprints"("team_id", "start_date");

-- CreateIndex
CREATE INDEX "sprints_workspace_id_status_idx" ON "sprints"("workspace_id", "status");

-- CreateIndex
CREATE INDEX "sprint_memberships_sprint_id_idx" ON "sprint_memberships"("sprint_id");

-- CreateIndex
CREATE INDEX "sprint_memberships_work_item_id_idx" ON "sprint_memberships"("work_item_id");

-- CreateIndex
CREATE INDEX "releases_project_id_idx" ON "releases"("project_id");

-- CreateIndex
CREATE INDEX "releases_workspace_id_status_idx" ON "releases"("workspace_id", "status");

-- CreateIndex
CREATE INDEX "release_memberships_release_id_idx" ON "release_memberships"("release_id");

-- CreateIndex
CREATE INDEX "release_memberships_work_item_id_idx" ON "release_memberships"("work_item_id");

-- CreateIndex
CREATE INDEX "release_milestones_release_id_idx" ON "release_milestones"("release_id");

-- CreateIndex
CREATE INDEX "release_forecast_history_release_id_changed_at_idx" ON "release_forecast_history"("release_id", "changed_at");

-- CreateIndex
CREATE UNIQUE INDEX "refinements_work_item_id_key" ON "refinements"("work_item_id");

-- CreateIndex
CREATE INDEX "refinements_intended_sprint_id_idx" ON "refinements"("intended_sprint_id");

-- CreateIndex
CREATE INDEX "refinement_check_items_refinement_id_position_idx" ON "refinement_check_items"("refinement_id", "position");

-- CreateIndex
CREATE INDEX "risks_workspace_id_status_idx" ON "risks"("workspace_id", "status");

-- CreateIndex
CREATE INDEX "risk_links_work_item_id_idx" ON "risk_links"("work_item_id");

-- CreateIndex
CREATE INDEX "risk_links_sprint_id_idx" ON "risk_links"("sprint_id");

-- CreateIndex
CREATE INDEX "risk_links_release_id_idx" ON "risk_links"("release_id");

-- CreateIndex
CREATE INDEX "risk_links_project_id_idx" ON "risk_links"("project_id");

-- CreateIndex
CREATE INDEX "risk_links_team_id_idx" ON "risk_links"("team_id");

-- CreateIndex
CREATE UNIQUE INDEX "risk_links_risk_id_work_item_id_key" ON "risk_links"("risk_id", "work_item_id");

-- CreateIndex
CREATE UNIQUE INDEX "risk_links_risk_id_sprint_id_key" ON "risk_links"("risk_id", "sprint_id");

-- CreateIndex
CREATE UNIQUE INDEX "risk_links_risk_id_release_id_key" ON "risk_links"("risk_id", "release_id");

-- CreateIndex
CREATE UNIQUE INDEX "risk_links_risk_id_project_id_key" ON "risk_links"("risk_id", "project_id");

-- CreateIndex
CREATE UNIQUE INDEX "risk_links_risk_id_team_id_key" ON "risk_links"("risk_id", "team_id");

-- CreateIndex
CREATE UNIQUE INDEX "risk_links_risk_id_task_id_key" ON "risk_links"("risk_id", "task_id");

-- CreateIndex
CREATE INDEX "journal_entries_workspace_id_occurred_on_idx" ON "journal_entries"("workspace_id", "occurred_on");

-- CreateIndex
CREATE INDEX "journal_links_team_id_idx" ON "journal_links"("team_id");

-- CreateIndex
CREATE INDEX "journal_links_project_id_idx" ON "journal_links"("project_id");

-- CreateIndex
CREATE INDEX "journal_links_sprint_id_idx" ON "journal_links"("sprint_id");

-- CreateIndex
CREATE INDEX "journal_links_release_id_idx" ON "journal_links"("release_id");

-- CreateIndex
CREATE INDEX "journal_links_work_item_id_idx" ON "journal_links"("work_item_id");

-- CreateIndex
CREATE INDEX "journal_links_risk_id_idx" ON "journal_links"("risk_id");

-- CreateIndex
CREATE UNIQUE INDEX "journal_links_entry_id_team_id_key" ON "journal_links"("entry_id", "team_id");

-- CreateIndex
CREATE UNIQUE INDEX "journal_links_entry_id_project_id_key" ON "journal_links"("entry_id", "project_id");

-- CreateIndex
CREATE UNIQUE INDEX "journal_links_entry_id_sprint_id_key" ON "journal_links"("entry_id", "sprint_id");

-- CreateIndex
CREATE UNIQUE INDEX "journal_links_entry_id_release_id_key" ON "journal_links"("entry_id", "release_id");

-- CreateIndex
CREATE UNIQUE INDEX "journal_links_entry_id_work_item_id_key" ON "journal_links"("entry_id", "work_item_id");

-- CreateIndex
CREATE UNIQUE INDEX "journal_links_entry_id_risk_id_key" ON "journal_links"("entry_id", "risk_id");

-- AddForeignKey
ALTER TABLE "external_sources" ADD CONSTRAINT "external_sources_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "external_work_items" ADD CONSTRAINT "external_work_items_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "external_work_items" ADD CONSTRAINT "external_work_items_source_id_fkey" FOREIGN KEY ("source_id") REFERENCES "external_sources"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "external_work_items" ADD CONSTRAINT "external_work_items_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "delivery_trackings" ADD CONSTRAINT "delivery_trackings_work_item_id_fkey" FOREIGN KEY ("work_item_id") REFERENCES "external_work_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "delivery_trackings" ADD CONSTRAINT "delivery_trackings_executing_team_id_fkey" FOREIGN KEY ("executing_team_id") REFERENCES "teams"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "delivery_trackings" ADD CONSTRAINT "delivery_trackings_developer_id_fkey" FOREIGN KEY ("developer_id") REFERENCES "developers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "delivery_tracking_history" ADD CONSTRAINT "delivery_tracking_history_delivery_tracking_id_fkey" FOREIGN KEY ("delivery_tracking_id") REFERENCES "delivery_trackings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "task_work_items" ADD CONSTRAINT "task_work_items_task_id_fkey" FOREIGN KEY ("task_id") REFERENCES "tasks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "task_work_items" ADD CONSTRAINT "task_work_items_work_item_id_fkey" FOREIGN KEY ("work_item_id") REFERENCES "external_work_items"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sprints" ADD CONSTRAINT "sprints_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sprints" ADD CONSTRAINT "sprints_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "teams"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sprint_memberships" ADD CONSTRAINT "sprint_memberships_sprint_id_fkey" FOREIGN KEY ("sprint_id") REFERENCES "sprints"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sprint_memberships" ADD CONSTRAINT "sprint_memberships_work_item_id_fkey" FOREIGN KEY ("work_item_id") REFERENCES "external_work_items"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "releases" ADD CONSTRAINT "releases_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "releases" ADD CONSTRAINT "releases_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "release_memberships" ADD CONSTRAINT "release_memberships_release_id_fkey" FOREIGN KEY ("release_id") REFERENCES "releases"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "release_memberships" ADD CONSTRAINT "release_memberships_work_item_id_fkey" FOREIGN KEY ("work_item_id") REFERENCES "external_work_items"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "release_milestones" ADD CONSTRAINT "release_milestones_release_id_fkey" FOREIGN KEY ("release_id") REFERENCES "releases"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "release_forecast_history" ADD CONSTRAINT "release_forecast_history_release_id_fkey" FOREIGN KEY ("release_id") REFERENCES "releases"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "refinements" ADD CONSTRAINT "refinements_work_item_id_fkey" FOREIGN KEY ("work_item_id") REFERENCES "external_work_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "refinements" ADD CONSTRAINT "refinements_intended_sprint_id_fkey" FOREIGN KEY ("intended_sprint_id") REFERENCES "sprints"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "refinement_check_items" ADD CONSTRAINT "refinement_check_items_refinement_id_fkey" FOREIGN KEY ("refinement_id") REFERENCES "refinements"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "risks" ADD CONSTRAINT "risks_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "risk_links" ADD CONSTRAINT "risk_links_risk_id_fkey" FOREIGN KEY ("risk_id") REFERENCES "risks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "risk_links" ADD CONSTRAINT "risk_links_work_item_id_fkey" FOREIGN KEY ("work_item_id") REFERENCES "external_work_items"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "risk_links" ADD CONSTRAINT "risk_links_sprint_id_fkey" FOREIGN KEY ("sprint_id") REFERENCES "sprints"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "risk_links" ADD CONSTRAINT "risk_links_release_id_fkey" FOREIGN KEY ("release_id") REFERENCES "releases"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "risk_links" ADD CONSTRAINT "risk_links_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "risk_links" ADD CONSTRAINT "risk_links_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "teams"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "risk_links" ADD CONSTRAINT "risk_links_task_id_fkey" FOREIGN KEY ("task_id") REFERENCES "tasks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "journal_entries" ADD CONSTRAINT "journal_entries_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "journal_links" ADD CONSTRAINT "journal_links_entry_id_fkey" FOREIGN KEY ("entry_id") REFERENCES "journal_entries"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "journal_links" ADD CONSTRAINT "journal_links_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "teams"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "journal_links" ADD CONSTRAINT "journal_links_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "journal_links" ADD CONSTRAINT "journal_links_sprint_id_fkey" FOREIGN KEY ("sprint_id") REFERENCES "sprints"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "journal_links" ADD CONSTRAINT "journal_links_release_id_fkey" FOREIGN KEY ("release_id") REFERENCES "releases"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "journal_links" ADD CONSTRAINT "journal_links_work_item_id_fkey" FOREIGN KEY ("work_item_id") REFERENCES "external_work_items"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "journal_links" ADD CONSTRAINT "journal_links_risk_id_fkey" FOREIGN KEY ("risk_id") REFERENCES "risks"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Constraints essenciais (§35.7) não representáveis no schema Prisma.
ALTER TABLE "external_sources" ADD CONSTRAINT "external_sources_version_positive" CHECK ("version" >= 1);
ALTER TABLE "external_work_items" ADD CONSTRAINT "external_work_items_version_positive" CHECK ("version" >= 1);
ALTER TABLE "external_work_items" ADD CONSTRAINT "external_work_items_key_not_blank" CHECK (btrim("external_key") <> '');
ALTER TABLE "sprints" ADD CONSTRAINT "sprints_version_positive" CHECK ("version" >= 1);
ALTER TABLE "releases" ADD CONSTRAINT "releases_version_positive" CHECK ("version" >= 1);
ALTER TABLE "risks" ADD CONSTRAINT "risks_version_positive" CHECK ("version" >= 1);
ALTER TABLE "journal_entries" ADD CONSTRAINT "journal_entries_version_positive" CHECK ("version" >= 1);

-- Esforço restante não negativo (§35.7, RN-031).
ALTER TABLE "delivery_trackings" ADD CONSTRAINT "delivery_trackings_remaining_non_negative" CHECK ("remaining_effort_hours" >= 0);
ALTER TABLE "delivery_tracking_history" ADD CONSTRAINT "delivery_tracking_history_remaining_non_negative" CHECK ("remaining_effort_hours" >= 0);

-- Períodos válidos (§35.7).
ALTER TABLE "sprints" ADD CONSTRAINT "sprints_valid_period" CHECK ("end_date" >= "start_date");
ALTER TABLE "sprint_memberships" ADD CONSTRAINT "sprint_memberships_valid_period" CHECK ("exited_at" IS NULL OR "exited_at" >= "entered_at");
ALTER TABLE "sprint_memberships" ADD CONSTRAINT "sprint_memberships_exit_reason" CHECK (("exited_at" IS NULL) = ("exit_reason" IS NULL));
ALTER TABLE "release_memberships" ADD CONSTRAINT "release_memberships_valid_period" CHECK ("removed_at" IS NULL OR "removed_at" >= "added_at");

-- Uma associação corrente de sprint por história (§35.7, RN-020); as encerradas ficam no histórico.
CREATE UNIQUE INDEX "sprint_memberships_current_unique" ON "sprint_memberships" ("work_item_id") WHERE "exited_at" IS NULL;
-- O mesmo item não entra duas vezes no escopo vigente de uma release.
CREATE UNIQUE INDEX "release_memberships_current_unique" ON "release_memberships" ("release_id", "work_item_id") WHERE "removed_at" IS NULL;

-- Só impedimentos têm nível de bloqueio (§16.4).
ALTER TABLE "risks" ADD CONSTRAINT "risks_blocking_level_only_impediment" CHECK ("type" = 'IMPEDIMENT' OR "blocking_level" IS NULL);

-- Cada vínculo aponta para exatamente um contexto (integridade referencial por FK).
ALTER TABLE "risk_links" ADD CONSTRAINT "risk_links_exactly_one_target"
  CHECK (num_nonnulls("work_item_id", "sprint_id", "release_id", "project_id", "team_id", "task_id") = 1);
ALTER TABLE "journal_links" ADD CONSTRAINT "journal_links_exactly_one_target"
  CHECK (num_nonnulls("team_id", "project_id", "sprint_id", "release_id", "work_item_id", "risk_id") = 1);

-- O registro do diário não é duplicado (§17.4): mesma categoria, data e descrição.
CREATE UNIQUE INDEX "journal_entries_no_duplicate" ON "journal_entries" ("workspace_id", "category", "occurred_on", md5("description"));
