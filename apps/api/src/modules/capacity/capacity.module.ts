import { Module } from "@nestjs/common";
import { AllocationsService } from "./allocations.service";
import { AvailabilityService } from "./availability.service";
import { CapacityController, ContextCapacityController } from "./capacity.controller";
import { CapacityService } from "./capacity.service";
import { SchedulesService } from "./schedules.service";

/** Capacidade (§34.12): jornadas, calendários, ausências, alocações e cálculos derivados. */
@Module({
  controllers: [CapacityController, ContextCapacityController],
  providers: [CapacityService, SchedulesService, AvailabilityService, AllocationsService],
  exports: [CapacityService],
})
export class CapacityModule {}
