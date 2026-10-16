-- CreateEnum
CREATE TYPE "AvailabilityExceptionType" AS ENUM ('VACATION', 'DAY_OFF', 'HOLIDAY', 'TRAINING', 'ABSENCE', 'EXTRA_SUPPORT', 'OTHER');

-- CreateEnum
CREATE TYPE "AllocationType" AS ENUM ('PERCENTAGE', 'HOURS');

-- CreateEnum
CREATE TYPE "AllocationPeriod" AS ENUM ('DAY', 'WEEK');

-- CreateEnum
CREATE TYPE "EstimateConfidence" AS ENUM ('HIGH', 'MEDIUM', 'LOW');

-- CreateTable
CREATE TABLE "work_schedules" (
    "id" UUID NOT NULL,
    "workspace_id" UUID NOT NULL,
    "developer_id" UUID NOT NULL,
    "valid_from" DATE NOT NULL,
    "valid_until" DATE,
    "timezone" VARCHAR(64) NOT NULL,
    "weekly_pattern" DECIMAL(4,2)[],
    "focus_factor" DECIMAL(3,2) NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "work_schedules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "availability_exceptions" (
    "id" UUID NOT NULL,
    "workspace_id" UUID NOT NULL,
    "developer_id" UUID,
    "type" "AvailabilityExceptionType" NOT NULL,
    "start_date" DATE NOT NULL,
    "end_date" DATE NOT NULL,
    "unavailable_hours" DECIMAL(4,2),
    "description" VARCHAR(200),
    "cancelled_at" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "availability_exceptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "capacity_allocations" (
    "id" UUID NOT NULL,
    "workspace_id" UUID NOT NULL,
    "developer_id" UUID NOT NULL,
    "team_id" UUID,
    "project_id" UUID,
    "allocation_type" "AllocationType" NOT NULL,
    "allocation_value" DECIMAL(7,4) NOT NULL,
    "period" "AllocationPeriod",
    "valid_from" DATE NOT NULL,
    "valid_until" DATE,
    "description" VARCHAR(300),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "capacity_allocations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "capacity_allocation_history" (
    "id" UUID NOT NULL,
    "allocation_id" UUID NOT NULL,
    "changed_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actor_user_id" UUID,
    "changed_fields" TEXT[],
    "team_id" UUID,
    "project_id" UUID,
    "allocation_type" "AllocationType" NOT NULL,
    "allocation_value" DECIMAL(7,4) NOT NULL,
    "period" "AllocationPeriod",
    "valid_from" DATE NOT NULL,
    "valid_until" DATE,

    CONSTRAINT "capacity_allocation_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "effort_estimates" (
    "id" UUID NOT NULL,
    "work_item_id" UUID NOT NULL,
    "estimated_hours" DECIMAL(7,2) NOT NULL,
    "remaining_hours" DECIMAL(7,2) NOT NULL,
    "confidence" "EstimateConfidence" NOT NULL,
    "story_points" DECIMAL(5,1),
    "actual_hours" DECIMAL(7,2),
    "reason" VARCHAR(500),
    "estimated_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actor_user_id" UUID,

    CONSTRAINT "effort_estimates_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "work_schedules_developer_id_valid_from_idx" ON "work_schedules"("developer_id", "valid_from");

-- CreateIndex
CREATE INDEX "availability_exceptions_developer_id_start_date_idx" ON "availability_exceptions"("developer_id", "start_date");

-- CreateIndex
CREATE INDEX "availability_exceptions_workspace_id_start_date_idx" ON "availability_exceptions"("workspace_id", "start_date");

-- CreateIndex
CREATE INDEX "capacity_allocations_developer_id_valid_from_idx" ON "capacity_allocations"("developer_id", "valid_from");

-- CreateIndex
CREATE INDEX "capacity_allocations_team_id_idx" ON "capacity_allocations"("team_id");

-- CreateIndex
CREATE INDEX "capacity_allocations_project_id_idx" ON "capacity_allocations"("project_id");

-- CreateIndex
CREATE INDEX "capacity_allocation_history_allocation_id_changed_at_idx" ON "capacity_allocation_history"("allocation_id", "changed_at");

-- CreateIndex
CREATE INDEX "effort_estimates_work_item_id_estimated_at_idx" ON "effort_estimates"("work_item_id", "estimated_at");

-- AddForeignKey
ALTER TABLE "work_schedules" ADD CONSTRAINT "work_schedules_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "work_schedules" ADD CONSTRAINT "work_schedules_developer_id_fkey" FOREIGN KEY ("developer_id") REFERENCES "developers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "availability_exceptions" ADD CONSTRAINT "availability_exceptions_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "availability_exceptions" ADD CONSTRAINT "availability_exceptions_developer_id_fkey" FOREIGN KEY ("developer_id") REFERENCES "developers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "capacity_allocations" ADD CONSTRAINT "capacity_allocations_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "capacity_allocations" ADD CONSTRAINT "capacity_allocations_developer_id_fkey" FOREIGN KEY ("developer_id") REFERENCES "developers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "capacity_allocations" ADD CONSTRAINT "capacity_allocations_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "teams"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "capacity_allocations" ADD CONSTRAINT "capacity_allocations_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "capacity_allocation_history" ADD CONSTRAINT "capacity_allocation_history_allocation_id_fkey" FOREIGN KEY ("allocation_id") REFERENCES "capacity_allocations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "effort_estimates" ADD CONSTRAINT "effort_estimates_work_item_id_fkey" FOREIGN KEY ("work_item_id") REFERENCES "external_work_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Constraints essenciais (§35.7) não representáveis no schema Prisma.
ALTER TABLE "work_schedules" ADD CONSTRAINT "work_schedules_version_positive" CHECK ("version" >= 1);
ALTER TABLE "availability_exceptions" ADD CONSTRAINT "availability_exceptions_version_positive" CHECK ("version" >= 1);
ALTER TABLE "capacity_allocations" ADD CONSTRAINT "capacity_allocations_version_positive" CHECK ("version" >= 1);

-- Jornada: sete dias (segunda a domingo), cada um entre 0 e 24 h; fator de foco entre 0 e 1 (§18.3, §35.7).
ALTER TABLE "work_schedules" ADD CONSTRAINT "work_schedules_weekly_pattern" CHECK (
  array_length("weekly_pattern", 1) = 7 AND array_position("weekly_pattern", NULL) IS NULL
  AND 0 <= ALL ("weekly_pattern") AND 24 >= ALL ("weekly_pattern")
);
ALTER TABLE "work_schedules" ADD CONSTRAINT "work_schedules_focus_factor_range" CHECK ("focus_factor" >= 0 AND "focus_factor" <= 1);

-- Períodos válidos (§35.7).
ALTER TABLE "work_schedules" ADD CONSTRAINT "work_schedules_valid_period" CHECK ("valid_until" IS NULL OR "valid_until" >= "valid_from");
ALTER TABLE "availability_exceptions" ADD CONSTRAINT "availability_exceptions_valid_period" CHECK ("end_date" >= "start_date");
ALTER TABLE "capacity_allocations" ADD CONSTRAINT "capacity_allocations_valid_period" CHECK ("valid_until" IS NULL OR "valid_until" >= "valid_from");
ALTER TABLE "capacity_allocation_history" ADD CONSTRAINT "capacity_allocation_history_valid_period" CHECK ("valid_until" IS NULL OR "valid_until" >= "valid_from");

-- Validação transacional de conflitos temporais (§35.7): uma jornada vigente por pessoa em cada dia.
CREATE EXTENSION IF NOT EXISTS btree_gist;
ALTER TABLE "work_schedules" ADD CONSTRAINT "work_schedules_no_overlap"
  EXCLUDE USING gist ("developer_id" WITH =, daterange("valid_from", "valid_until", '[]') WITH &&);

-- Ausência parcial entre 0 e 24 h por dia; sem pessoa, só feriados do calendário do workspace (§19).
ALTER TABLE "availability_exceptions" ADD CONSTRAINT "availability_exceptions_hours_range"
  CHECK ("unavailable_hours" IS NULL OR ("unavailable_hours" > 0 AND "unavailable_hours" <= 24));
ALTER TABLE "availability_exceptions" ADD CONSTRAINT "availability_exceptions_workspace_holiday"
  CHECK ("developer_id" IS NOT NULL OR "type" = 'HOLIDAY');

-- Alocação: percentual em (0, 1] sem periodicidade; horas > 0 com periodicidade explícita (§20.3, §35.7).
ALTER TABLE "capacity_allocations" ADD CONSTRAINT "capacity_allocations_value" CHECK (
  ("allocation_type" = 'PERCENTAGE' AND "allocation_value" > 0 AND "allocation_value" <= 1 AND "period" IS NULL)
  OR ("allocation_type" = 'HOURS' AND "allocation_value" > 0 AND "period" IS NOT NULL)
);
-- Reserva geral (sem time e sem projeto) precisa dizer para que é (§20.5).
ALTER TABLE "capacity_allocations" ADD CONSTRAINT "capacity_allocations_reserve_described"
  CHECK ("team_id" IS NOT NULL OR "project_id" IS NOT NULL OR "description" IS NOT NULL);

-- Estimativas: horas e esforço restante não negativos (§21.5, RN-031).
ALTER TABLE "effort_estimates" ADD CONSTRAINT "effort_estimates_non_negative" CHECK (
  "estimated_hours" >= 0 AND "remaining_hours" >= 0
  AND ("actual_hours" IS NULL OR "actual_hours" >= 0) AND ("story_points" IS NULL OR "story_points" >= 0)
);
