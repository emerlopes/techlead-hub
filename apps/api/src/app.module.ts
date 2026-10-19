import { Module } from "@nestjs/common";
import { APP_FILTER } from "@nestjs/core";
import { AllExceptionsFilter } from "./common/all-exceptions.filter";
import { ConfigModule } from "./infrastructure/config/config.module";
import { PrismaModule } from "./infrastructure/prisma/prisma.module";
import { AuditModule } from "./modules/audit/audit.module";
import { CapacityModule } from "./modules/capacity/capacity.module";
import { DashboardModule } from "./modules/dashboard/dashboard.module";
import { DevelopersModule } from "./modules/developers/developers.module";
import { HealthModule } from "./modules/health/health.module";
import { IdentityModule } from "./modules/identity/identity.module";
import { JournalModule } from "./modules/journal/journal.module";
import { PlanningModule } from "./modules/planning/planning.module";
import { ProjectsModule } from "./modules/projects/projects.module";
import { ReleasesModule } from "./modules/releases/releases.module";
import { ReportsModule } from "./modules/reports/reports.module";
import { RisksModule } from "./modules/risks/risks.module";
import { SprintsModule } from "./modules/sprints/sprints.module";
import { TasksModule } from "./modules/tasks/tasks.module";
import { TeamsModule } from "./modules/teams/teams.module";
import { WorkItemsModule } from "./modules/work-items/work-items.module";
import { WorkspaceModule } from "./modules/workspace/workspace.module";

@Module({
  imports: [
    ConfigModule,
    PrismaModule,
    AuditModule,
    IdentityModule,
    WorkspaceModule,
    TeamsModule,
    ProjectsModule,
    DevelopersModule,
    TasksModule,
    WorkItemsModule,
    SprintsModule,
    ReleasesModule,
    RisksModule,
    JournalModule,
    CapacityModule,
    PlanningModule,
    ReportsModule,
    DashboardModule,
    HealthModule,
  ],
  providers: [{ provide: APP_FILTER, useClass: AllExceptionsFilter }],
})
export class AppModule {}
