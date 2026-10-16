import { Module } from "@nestjs/common";
import { WorkItemsModule } from "../work-items/work-items.module";
import { ReleaseMilestonesController, ReleasesController } from "./releases.controller";
import { ReleasesService } from "./releases.service";

@Module({
  imports: [WorkItemsModule],
  controllers: [ReleasesController, ReleaseMilestonesController],
  providers: [ReleasesService],
  exports: [ReleasesService],
})
export class ReleasesModule {}
