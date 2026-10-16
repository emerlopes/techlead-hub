import { Body, Controller, Delete, Get, HttpCode, Param, Patch, Post, Query } from "@nestjs/common";
import {
  type Allocation,
  type AllocationDetail,
  allocationListQuerySchema,
  type AvailabilityException,
  cancelSchema,
  type CapacityOverview,
  capacityOverviewQuerySchema,
  capacityRangeQuerySchema,
  createAllocationSchema,
  createAvailabilityExceptionSchema,
  createDeveloperExceptionSchema,
  createWorkScheduleSchema,
  type DeveloperCapacityDetail,
  exceptionListQuerySchema,
  type ProjectDemand,
  scheduleListQuerySchema,
  type TeamCapacity,
  updateAllocationSchema,
  updateAvailabilityExceptionSchema,
  updateWorkScheduleSchema,
  type WorkSchedule,
} from "@tlh/shared-contracts";
import type { z } from "zod";
import { UuidParamPipe } from "../../common/uuid-param.pipe";
import { ZodValidationPipe } from "../../common/zod-validation.pipe";
import { type AuthContext, CurrentAuth } from "../identity/auth-context";
import { AllocationsService } from "./allocations.service";
import { AvailabilityService } from "./availability.service";
import { CapacityService } from "./capacity.service";
import { SchedulesService } from "./schedules.service";

type Range = z.output<typeof capacityRangeQuerySchema>;
const rangePipe = new ZodValidationPipe(capacityRangeQuerySchema);

/** Capacidade (§36.10) e acréscimos: visão geral, jornadas e ausências. */
@Controller("capacity")
export class CapacityController {
  constructor(
    private readonly capacity: CapacityService,
    private readonly schedules: SchedulesService,
    private readonly availability: AvailabilityService,
    private readonly allocations: AllocationsService,
  ) {}

  /** Acréscimo: pessoas, times e projetos no período, sem duplicar horas (RN-037). */
  @Get()
  overview(
    @CurrentAuth() auth: AuthContext,
    @Query(new ZodValidationPipe(capacityOverviewQuerySchema)) query: z.output<typeof capacityOverviewQuerySchema>,
  ): Promise<CapacityOverview> {
    return this.capacity.overview(auth, query);
  }

  @Get("allocations")
  listAllocations(
    @CurrentAuth() auth: AuthContext,
    @Query(new ZodValidationPipe(allocationListQuerySchema)) query: z.output<typeof allocationListQuerySchema>,
  ): Promise<Allocation[]> {
    return this.allocations.list(auth, query);
  }

  @Post("allocations")
  createAllocation(
    @CurrentAuth() auth: AuthContext,
    @Body(new ZodValidationPipe(createAllocationSchema)) body: z.output<typeof createAllocationSchema>,
  ): Promise<AllocationDetail> {
    return this.allocations.create(auth, body);
  }

  @Get("allocations/:id")
  getAllocation(@CurrentAuth() auth: AuthContext, @Param("id", UuidParamPipe) id: string): Promise<AllocationDetail> {
    return this.allocations.get(auth, id);
  }

  @Patch("allocations/:id")
  updateAllocation(
    @CurrentAuth() auth: AuthContext,
    @Param("id", UuidParamPipe) id: string,
    @Body(new ZodValidationPipe(updateAllocationSchema)) body: z.output<typeof updateAllocationSchema>,
  ): Promise<AllocationDetail> {
    return this.allocations.update(auth, id, body);
  }

  /** Acréscimo: só alocações que ainda não começaram (§35.9). */
  @Delete("allocations/:id")
  @HttpCode(204)
  removeAllocation(@CurrentAuth() auth: AuthContext, @Param("id", UuidParamPipe) id: string): Promise<void> {
    return this.allocations.remove(auth, id);
  }

  @Get("schedules")
  listSchedules(
    @CurrentAuth() auth: AuthContext,
    @Query(new ZodValidationPipe(scheduleListQuerySchema)) query: z.output<typeof scheduleListQuerySchema>,
  ): Promise<WorkSchedule[]> {
    return this.schedules.list(auth, query);
  }

  @Post("schedules")
  createSchedule(
    @CurrentAuth() auth: AuthContext,
    @Body(new ZodValidationPipe(createWorkScheduleSchema)) body: z.output<typeof createWorkScheduleSchema>,
  ): Promise<WorkSchedule> {
    return this.schedules.create(auth, body);
  }

  @Patch("schedules/:id")
  updateSchedule(
    @CurrentAuth() auth: AuthContext,
    @Param("id", UuidParamPipe) id: string,
    @Body(new ZodValidationPipe(updateWorkScheduleSchema)) body: z.output<typeof updateWorkScheduleSchema>,
  ): Promise<WorkSchedule> {
    return this.schedules.update(auth, id, body);
  }

  @Get("availability-exceptions")
  listExceptions(
    @CurrentAuth() auth: AuthContext,
    @Query(new ZodValidationPipe(exceptionListQuerySchema)) query: z.output<typeof exceptionListQuerySchema>,
  ): Promise<AvailabilityException[]> {
    return this.availability.list(auth, query);
  }

  /** Ausência de uma pessoa ou, sem pessoa, feriado do calendário do workspace. */
  @Post("availability-exceptions")
  createException(
    @CurrentAuth() auth: AuthContext,
    @Body(new ZodValidationPipe(createAvailabilityExceptionSchema)) body: z.output<typeof createAvailabilityExceptionSchema>,
  ): Promise<AvailabilityException> {
    return this.availability.create(auth, body);
  }

  @Patch("availability-exceptions/:id")
  updateException(
    @CurrentAuth() auth: AuthContext,
    @Param("id", UuidParamPipe) id: string,
    @Body(new ZodValidationPipe(updateAvailabilityExceptionSchema)) body: z.output<typeof updateAvailabilityExceptionSchema>,
  ): Promise<AvailabilityException> {
    return this.availability.update(auth, id, body);
  }

  @Post("availability-exceptions/:id/cancel")
  @HttpCode(200)
  cancelException(
    @CurrentAuth() auth: AuthContext,
    @Param("id", UuidParamPipe) id: string,
    @Body(new ZodValidationPipe(cancelSchema)) body: z.output<typeof cancelSchema>,
  ): Promise<AvailabilityException> {
    return this.availability.cancel(auth, id, body);
  }
}

/** Rotas de capacidade aninhadas em pessoas, times e projetos (§36.5, §36.10). */
@Controller()
export class ContextCapacityController {
  constructor(
    private readonly capacity: CapacityService,
    private readonly availability: AvailabilityService,
  ) {}

  @Get("developers/:id/capacity")
  developer(@CurrentAuth() auth: AuthContext, @Param("id", UuidParamPipe) id: string, @Query(rangePipe) query: Range): Promise<DeveloperCapacityDetail> {
    return this.capacity.developer(auth, id, query);
  }

  @Post("developers/:id/availability-exceptions")
  createDeveloperException(
    @CurrentAuth() auth: AuthContext,
    @Param("id", UuidParamPipe) id: string,
    @Body(new ZodValidationPipe(createDeveloperExceptionSchema)) body: z.output<typeof createDeveloperExceptionSchema>,
  ): Promise<AvailabilityException> {
    return this.availability.create(auth, { ...body, developerId: id });
  }

  @Get("teams/:id/capacity")
  team(@CurrentAuth() auth: AuthContext, @Param("id", UuidParamPipe) id: string, @Query(rangePipe) query: Range): Promise<TeamCapacity> {
    return this.capacity.team(auth, id, query);
  }

  @Get("projects/:id/demand")
  projectDemand(@CurrentAuth() auth: AuthContext, @Param("id", UuidParamPipe) id: string, @Query(rangePipe) query: Range): Promise<ProjectDemand> {
    return this.capacity.projectDemand(auth, id, query);
  }
}
