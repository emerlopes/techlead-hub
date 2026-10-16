-- AlterTable
ALTER TABLE "releases" ADD COLUMN     "sprint_length_days" INTEGER,
ADD COLUMN     "start_date" DATE;

-- AlterTable
ALTER TABLE "sprints" ADD COLUMN     "release_id" UUID;

-- CreateIndex
CREATE INDEX "sprints_release_id_idx" ON "sprints"("release_id");

-- AddForeignKey
ALTER TABLE "sprints" ADD CONSTRAINT "sprints_release_id_fkey" FOREIGN KEY ("release_id") REFERENCES "releases"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Duração da sprint gerada em dias úteis e calendário que começa até o prazo.
ALTER TABLE "releases" ADD CONSTRAINT "releases_sprint_length_range" CHECK ("sprint_length_days" BETWEEN 1 AND 60);
ALTER TABLE "releases" ADD CONSTRAINT "releases_calendar_period" CHECK ("start_date" IS NULL OR "committed_date" IS NULL OR "start_date" <= "committed_date");
