-- DropForeignKey
ALTER TABLE "availability_exceptions" DROP CONSTRAINT "availability_exceptions_developer_id_fkey";

-- DropForeignKey
ALTER TABLE "capacity_allocations" DROP CONSTRAINT "capacity_allocations_developer_id_fkey";

-- DropForeignKey
ALTER TABLE "capacity_allocations" DROP CONSTRAINT "capacity_allocations_project_id_fkey";

-- DropForeignKey
ALTER TABLE "capacity_allocations" DROP CONSTRAINT "capacity_allocations_team_id_fkey";

-- DropForeignKey
ALTER TABLE "delivery_trackings" DROP CONSTRAINT "delivery_trackings_developer_id_fkey";

-- DropForeignKey
ALTER TABLE "delivery_trackings" DROP CONSTRAINT "delivery_trackings_executing_team_id_fkey";

-- DropForeignKey
ALTER TABLE "execution_plan_items" DROP CONSTRAINT "execution_plan_items_work_item_id_fkey";

-- DropForeignKey
ALTER TABLE "execution_plans" DROP CONSTRAINT "execution_plans_developer_id_fkey";

-- DropForeignKey
ALTER TABLE "execution_plans" DROP CONSTRAINT "execution_plans_project_id_fkey";

-- DropForeignKey
ALTER TABLE "execution_plans" DROP CONSTRAINT "execution_plans_team_id_fkey";

-- DropForeignKey
ALTER TABLE "external_work_items" DROP CONSTRAINT "external_work_items_project_id_fkey";

-- DropForeignKey
ALTER TABLE "journal_links" DROP CONSTRAINT "journal_links_project_id_fkey";

-- DropForeignKey
ALTER TABLE "journal_links" DROP CONSTRAINT "journal_links_release_id_fkey";

-- DropForeignKey
ALTER TABLE "journal_links" DROP CONSTRAINT "journal_links_risk_id_fkey";

-- DropForeignKey
ALTER TABLE "journal_links" DROP CONSTRAINT "journal_links_sprint_id_fkey";

-- DropForeignKey
ALTER TABLE "journal_links" DROP CONSTRAINT "journal_links_team_id_fkey";

-- DropForeignKey
ALTER TABLE "journal_links" DROP CONSTRAINT "journal_links_work_item_id_fkey";

-- DropForeignKey
ALTER TABLE "refinements" DROP CONSTRAINT "refinements_intended_sprint_id_fkey";

-- DropForeignKey
ALTER TABLE "release_memberships" DROP CONSTRAINT "release_memberships_release_id_fkey";

-- DropForeignKey
ALTER TABLE "release_memberships" DROP CONSTRAINT "release_memberships_work_item_id_fkey";

-- DropForeignKey
ALTER TABLE "releases" DROP CONSTRAINT "releases_project_id_fkey";

-- DropForeignKey
ALTER TABLE "risk_links" DROP CONSTRAINT "risk_links_project_id_fkey";

-- DropForeignKey
ALTER TABLE "risk_links" DROP CONSTRAINT "risk_links_release_id_fkey";

-- DropForeignKey
ALTER TABLE "risk_links" DROP CONSTRAINT "risk_links_sprint_id_fkey";

-- DropForeignKey
ALTER TABLE "risk_links" DROP CONSTRAINT "risk_links_team_id_fkey";

-- DropForeignKey
ALTER TABLE "risk_links" DROP CONSTRAINT "risk_links_work_item_id_fkey";

-- DropForeignKey
ALTER TABLE "sprint_memberships" DROP CONSTRAINT "sprint_memberships_sprint_id_fkey";

-- DropForeignKey
ALTER TABLE "sprint_memberships" DROP CONSTRAINT "sprint_memberships_work_item_id_fkey";

-- DropForeignKey
ALTER TABLE "sprints" DROP CONSTRAINT "sprints_release_id_fkey";

-- DropForeignKey
ALTER TABLE "sprints" DROP CONSTRAINT "sprints_team_id_fkey";

-- DropForeignKey
ALTER TABLE "task_projects" DROP CONSTRAINT "task_projects_project_id_fkey";

-- DropForeignKey
ALTER TABLE "task_teams" DROP CONSTRAINT "task_teams_team_id_fkey";

-- DropForeignKey
ALTER TABLE "task_work_items" DROP CONSTRAINT "task_work_items_work_item_id_fkey";

-- DropForeignKey
ALTER TABLE "team_developers" DROP CONSTRAINT "team_developers_developer_id_fkey";

-- DropForeignKey
ALTER TABLE "team_developers" DROP CONSTRAINT "team_developers_team_id_fkey";

-- DropForeignKey
ALTER TABLE "team_projects" DROP CONSTRAINT "team_projects_project_id_fkey";

-- DropForeignKey
ALTER TABLE "team_projects" DROP CONSTRAINT "team_projects_team_id_fkey";

-- DropForeignKey
ALTER TABLE "work_dependencies" DROP CONSTRAINT "work_dependencies_predecessor_id_fkey";

-- DropForeignKey
ALTER TABLE "work_dependencies" DROP CONSTRAINT "work_dependencies_successor_id_fkey";

-- DropForeignKey
ALTER TABLE "work_schedules" DROP CONSTRAINT "work_schedules_developer_id_fkey";

-- AddForeignKey
ALTER TABLE "team_projects" ADD CONSTRAINT "team_projects_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "teams"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "team_projects" ADD CONSTRAINT "team_projects_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "team_developers" ADD CONSTRAINT "team_developers_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "teams"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "team_developers" ADD CONSTRAINT "team_developers_developer_id_fkey" FOREIGN KEY ("developer_id") REFERENCES "developers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "task_teams" ADD CONSTRAINT "task_teams_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "teams"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "task_projects" ADD CONSTRAINT "task_projects_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "external_work_items" ADD CONSTRAINT "external_work_items_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "delivery_trackings" ADD CONSTRAINT "delivery_trackings_executing_team_id_fkey" FOREIGN KEY ("executing_team_id") REFERENCES "teams"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "delivery_trackings" ADD CONSTRAINT "delivery_trackings_developer_id_fkey" FOREIGN KEY ("developer_id") REFERENCES "developers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "task_work_items" ADD CONSTRAINT "task_work_items_work_item_id_fkey" FOREIGN KEY ("work_item_id") REFERENCES "external_work_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sprints" ADD CONSTRAINT "sprints_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "teams"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sprints" ADD CONSTRAINT "sprints_release_id_fkey" FOREIGN KEY ("release_id") REFERENCES "releases"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sprint_memberships" ADD CONSTRAINT "sprint_memberships_sprint_id_fkey" FOREIGN KEY ("sprint_id") REFERENCES "sprints"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sprint_memberships" ADD CONSTRAINT "sprint_memberships_work_item_id_fkey" FOREIGN KEY ("work_item_id") REFERENCES "external_work_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "releases" ADD CONSTRAINT "releases_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "release_memberships" ADD CONSTRAINT "release_memberships_release_id_fkey" FOREIGN KEY ("release_id") REFERENCES "releases"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "release_memberships" ADD CONSTRAINT "release_memberships_work_item_id_fkey" FOREIGN KEY ("work_item_id") REFERENCES "external_work_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "refinements" ADD CONSTRAINT "refinements_intended_sprint_id_fkey" FOREIGN KEY ("intended_sprint_id") REFERENCES "sprints"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "risk_links" ADD CONSTRAINT "risk_links_work_item_id_fkey" FOREIGN KEY ("work_item_id") REFERENCES "external_work_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "risk_links" ADD CONSTRAINT "risk_links_sprint_id_fkey" FOREIGN KEY ("sprint_id") REFERENCES "sprints"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "risk_links" ADD CONSTRAINT "risk_links_release_id_fkey" FOREIGN KEY ("release_id") REFERENCES "releases"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "risk_links" ADD CONSTRAINT "risk_links_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "risk_links" ADD CONSTRAINT "risk_links_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "teams"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "journal_links" ADD CONSTRAINT "journal_links_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "teams"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "journal_links" ADD CONSTRAINT "journal_links_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "journal_links" ADD CONSTRAINT "journal_links_sprint_id_fkey" FOREIGN KEY ("sprint_id") REFERENCES "sprints"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "journal_links" ADD CONSTRAINT "journal_links_release_id_fkey" FOREIGN KEY ("release_id") REFERENCES "releases"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "journal_links" ADD CONSTRAINT "journal_links_work_item_id_fkey" FOREIGN KEY ("work_item_id") REFERENCES "external_work_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "journal_links" ADD CONSTRAINT "journal_links_risk_id_fkey" FOREIGN KEY ("risk_id") REFERENCES "risks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "work_schedules" ADD CONSTRAINT "work_schedules_developer_id_fkey" FOREIGN KEY ("developer_id") REFERENCES "developers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "availability_exceptions" ADD CONSTRAINT "availability_exceptions_developer_id_fkey" FOREIGN KEY ("developer_id") REFERENCES "developers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "capacity_allocations" ADD CONSTRAINT "capacity_allocations_developer_id_fkey" FOREIGN KEY ("developer_id") REFERENCES "developers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "capacity_allocations" ADD CONSTRAINT "capacity_allocations_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "teams"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "capacity_allocations" ADD CONSTRAINT "capacity_allocations_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "execution_plans" ADD CONSTRAINT "execution_plans_developer_id_fkey" FOREIGN KEY ("developer_id") REFERENCES "developers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "execution_plans" ADD CONSTRAINT "execution_plans_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "teams"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "execution_plans" ADD CONSTRAINT "execution_plans_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "execution_plan_items" ADD CONSTRAINT "execution_plan_items_work_item_id_fkey" FOREIGN KEY ("work_item_id") REFERENCES "external_work_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "work_dependencies" ADD CONSTRAINT "work_dependencies_predecessor_id_fkey" FOREIGN KEY ("predecessor_id") REFERENCES "external_work_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "work_dependencies" ADD CONSTRAINT "work_dependencies_successor_id_fkey" FOREIGN KEY ("successor_id") REFERENCES "external_work_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;
