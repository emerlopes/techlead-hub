import { Module } from "@nestjs/common";
import { ExternalSourcesService } from "./external-sources.service";
import { RefinementsService } from "./refinements.service";
import {
  ExternalSourcesController,
  RefinementCheckItemsController,
  RefinementsController,
  WorkItemsController,
} from "./work-items.controller";
import { WorkItemsService } from "./work-items.service";

/** Itens externos, acompanhamento e refinamento (§34.7, §34.10, §34.11). */
@Module({
  controllers: [WorkItemsController, RefinementsController, RefinementCheckItemsController, ExternalSourcesController],
  providers: [WorkItemsService, RefinementsService, ExternalSourcesService],
  exports: [WorkItemsService, RefinementsService],
})
export class WorkItemsModule {}
