import { Module } from "@nestjs/common";
import { CapacityModule } from "../capacity/capacity.module";
import { ReleasesModule } from "../releases/releases.module";
import { SprintsModule } from "../sprints/sprints.module";
import { TasksModule } from "../tasks/tasks.module";
import { WorkItemsModule } from "../work-items/work-items.module";
import { DashboardController } from "./dashboard.controller";
import { DashboardService } from "./dashboard.service";

@Module({
  imports: [TasksModule, CapacityModule, WorkItemsModule, SprintsModule, ReleasesModule],
  controllers: [DashboardController],
  providers: [DashboardService],
})
export class DashboardModule {}
