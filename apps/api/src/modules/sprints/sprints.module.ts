import { Module } from "@nestjs/common";
import { CapacityModule } from "../capacity/capacity.module";
import { WorkItemsModule } from "../work-items/work-items.module";
import { SprintsController } from "./sprints.controller";
import { SprintsService } from "./sprints.service";

@Module({
  imports: [WorkItemsModule, CapacityModule],
  controllers: [SprintsController],
  providers: [SprintsService],
  exports: [SprintsService],
})
export class SprintsModule {}
