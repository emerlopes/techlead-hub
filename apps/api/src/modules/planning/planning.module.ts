import { Module } from "@nestjs/common";
import { DependenciesService } from "./dependencies.service";
import { ExecutionPlansService } from "./execution-plans.service";
import { PlanProjectionService } from "./plan-projection.service";
import { ExecutionPlansController, WorkDependenciesController } from "./planning.controller";

/** Planning (§34.13): filas, paralelismo, redistribuição e dependências. */
@Module({
  controllers: [ExecutionPlansController, WorkDependenciesController],
  providers: [ExecutionPlansService, DependenciesService, PlanProjectionService],
  exports: [DependenciesService],
})
export class PlanningModule {}
