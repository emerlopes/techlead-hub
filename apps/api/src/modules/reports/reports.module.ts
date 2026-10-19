import { Module } from "@nestjs/common";
import { CapacityModule } from "../capacity/capacity.module";
import { JournalModule } from "../journal/journal.module";
import { PlanningModule } from "../planning/planning.module";
import { ReleasesModule } from "../releases/releases.module";
import { RisksModule } from "../risks/risks.module";
import { SprintsModule } from "../sprints/sprints.module";
import { ReportsController } from "./reports.controller";
import { ReportsService } from "./reports.service";

/** Reports (§34.17): relatórios de sprint, release e capacidade e rascunhos de demo e retrospectiva. */
@Module({
  imports: [SprintsModule, ReleasesModule, CapacityModule, RisksModule, JournalModule, PlanningModule],
  controllers: [ReportsController],
  providers: [ReportsService],
})
export class ReportsModule {}
