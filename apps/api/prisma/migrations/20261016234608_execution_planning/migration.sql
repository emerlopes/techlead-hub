-- CreateEnum
CREATE TYPE "ExecutionMode" AS ENUM ('SEQUENTIAL', 'PARALLEL', 'HYBRID');

-- CreateEnum
CREATE TYPE "RedistributionPolicy" AS ENUM ('NONE', 'SAME_CONTEXT', 'CROSS_CONTEXT');

-- CreateEnum
CREATE TYPE "ExecutionPlanStatus" AS ENUM ('DRAFT', 'ACTIVE', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "DependencyType" AS ENUM ('FINISH_TO_START', 'START_TO_START', 'FINISH_TO_FINISH', 'EXTERNAL', 'INFORMATIONAL');

-- CreateEnum
CREATE TYPE "DependencyStatus" AS ENUM ('OPEN', 'RELEASED');

-- CreateTable
CREATE TABLE "execution_plans" (
    "id" UUID NOT NULL,
    "workspace_id" UUID NOT NULL,
    "developer_id" UUID NOT NULL,
    "team_id" UUID,
    "project_id" UUID,
    "start_date" DATE NOT NULL,
    "end_date" DATE NOT NULL,
    "execution_mode" "ExecutionMode" NOT NULL DEFAULT 'SEQUENTIAL',
    "max_parallel_items" INTEGER NOT NULL DEFAULT 1,
    "redistribution_policy" "RedistributionPolicy" NOT NULL DEFAULT 'SAME_CONTEXT',
    "status" "ExecutionPlanStatus" NOT NULL DEFAULT 'ACTIVE',
    "notes" VARCHAR(1000),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "execution_plans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "execution_plan_items" (
    "id" UUID NOT NULL,
    "execution_plan_id" UUID NOT NULL,
    "work_item_id" UUID NOT NULL,
    "position" INTEGER NOT NULL,
    "capacity_share" DECIMAL(5,4),
    "earliest_start_date" DATE,
    "notes" VARCHAR(500),

    CONSTRAINT "execution_plan_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "work_dependencies" (
    "id" UUID NOT NULL,
    "workspace_id" UUID NOT NULL,
    "predecessor_id" UUID,
    "successor_id" UUID NOT NULL,
    "dependency_type" "DependencyType" NOT NULL,
    "external_reference" VARCHAR(200),
    "expected_release_date" DATE,
    "actual_release_date" DATE,
    "status" "DependencyStatus" NOT NULL DEFAULT 'OPEN',
    "notes" VARCHAR(1000),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "work_dependencies_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "execution_plans_developer_id_status_idx" ON "execution_plans"("developer_id", "status");

-- CreateIndex
CREATE INDEX "execution_plans_team_id_idx" ON "execution_plans"("team_id");

-- CreateIndex
CREATE INDEX "execution_plans_project_id_idx" ON "execution_plans"("project_id");

-- CreateIndex
CREATE INDEX "execution_plan_items_work_item_id_idx" ON "execution_plan_items"("work_item_id");

-- CreateIndex
CREATE UNIQUE INDEX "execution_plan_items_execution_plan_id_work_item_id_key" ON "execution_plan_items"("execution_plan_id", "work_item_id");

-- CreateIndex
CREATE UNIQUE INDEX "execution_plan_items_execution_plan_id_position_key" ON "execution_plan_items"("execution_plan_id", "position");

-- CreateIndex
CREATE INDEX "work_dependencies_successor_id_idx" ON "work_dependencies"("successor_id");

-- CreateIndex
CREATE INDEX "work_dependencies_predecessor_id_idx" ON "work_dependencies"("predecessor_id");

-- CreateIndex
CREATE INDEX "work_dependencies_workspace_id_dependency_type_idx" ON "work_dependencies"("workspace_id", "dependency_type");

-- CreateIndex
CREATE UNIQUE INDEX "work_dependencies_predecessor_id_successor_id_dependency_ty_key" ON "work_dependencies"("predecessor_id", "successor_id", "dependency_type");

-- AddForeignKey
ALTER TABLE "execution_plans" ADD CONSTRAINT "execution_plans_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "execution_plans" ADD CONSTRAINT "execution_plans_developer_id_fkey" FOREIGN KEY ("developer_id") REFERENCES "developers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "execution_plans" ADD CONSTRAINT "execution_plans_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "teams"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "execution_plans" ADD CONSTRAINT "execution_plans_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "execution_plan_items" ADD CONSTRAINT "execution_plan_items_execution_plan_id_fkey" FOREIGN KEY ("execution_plan_id") REFERENCES "execution_plans"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "execution_plan_items" ADD CONSTRAINT "execution_plan_items_work_item_id_fkey" FOREIGN KEY ("work_item_id") REFERENCES "external_work_items"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "work_dependencies" ADD CONSTRAINT "work_dependencies_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "work_dependencies" ADD CONSTRAINT "work_dependencies_predecessor_id_fkey" FOREIGN KEY ("predecessor_id") REFERENCES "external_work_items"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "work_dependencies" ADD CONSTRAINT "work_dependencies_successor_id_fkey" FOREIGN KEY ("successor_id") REFERENCES "external_work_items"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Constraints essenciais (§35.7) não representáveis no schema Prisma.
ALTER TABLE "execution_plans" ADD CONSTRAINT "execution_plans_version_positive" CHECK ("version" >= 1);
ALTER TABLE "work_dependencies" ADD CONSTRAINT "work_dependencies_version_positive" CHECK ("version" >= 1);

-- Períodos válidos (§35.7).
ALTER TABLE "execution_plans" ADD CONSTRAINT "execution_plans_valid_period" CHECK ("end_date" >= "start_date");

-- Limite de simultaneidade configurável (§22.5); sequencial executa um item por vez (§22.2).
ALTER TABLE "execution_plans" ADD CONSTRAINT "execution_plans_parallel_range"
  CHECK ("max_parallel_items" BETWEEN 1 AND 10 AND ("execution_mode" <> 'SEQUENTIAL' OR "max_parallel_items" = 1));

-- Um plano ativo por pessoa e contexto (time, projeto): a capacidade do contexto não é consumida duas
-- vezes (RN-026). Rascunhos e arquivados ficam livres.
CREATE UNIQUE INDEX "execution_plans_one_active_per_context" ON "execution_plans" ("developer_id", "team_id", "project_id")
  NULLS NOT DISTINCT WHERE "status" = 'ACTIVE';

-- Fila: posição explícita a partir de 1; parcela entre zero e um (§22.5, §35.7).
ALTER TABLE "execution_plan_items" ADD CONSTRAINT "execution_plan_items_position_positive" CHECK ("position" >= 1);
ALTER TABLE "execution_plan_items" ADD CONSTRAINT "execution_plan_items_share_range"
  CHECK ("capacity_share" IS NULL OR ("capacity_share" > 0 AND "capacity_share" <= 1));

-- Dependências (§24.5): sem auto-dependência; externa sem predecessor e com referência; interna com
-- predecessor; só a externa é liberada manualmente, com data de liberação.
ALTER TABLE "work_dependencies" ADD CONSTRAINT "work_dependencies_not_self" CHECK ("predecessor_id" IS NULL OR "predecessor_id" <> "successor_id");
ALTER TABLE "work_dependencies" ADD CONSTRAINT "work_dependencies_shape" CHECK (
  ("dependency_type" = 'EXTERNAL' AND "predecessor_id" IS NULL AND "external_reference" IS NOT NULL)
  OR ("dependency_type" <> 'EXTERNAL' AND "predecessor_id" IS NOT NULL AND "expected_release_date" IS NULL)
);
ALTER TABLE "work_dependencies" ADD CONSTRAINT "work_dependencies_release" CHECK (
  ("status" = 'OPEN' AND "actual_release_date" IS NULL)
  OR ("status" = 'RELEASED' AND "dependency_type" = 'EXTERNAL' AND "actual_release_date" IS NOT NULL)
);
