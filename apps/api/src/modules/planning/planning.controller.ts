import { Body, Controller, Delete, Get, HttpCode, Param, Patch, Post, Query } from "@nestjs/common";
import {
  createExecutionPlanSchema,
  createWorkDependencySchema,
  dependencyListQuerySchema,
  type ExecutionPlan,
  type ExecutionPlanDetail,
  planListQuerySchema,
  releaseWorkDependencySchema,
  updateExecutionPlanSchema,
  updateWorkDependencySchema,
  type WorkDependency,
} from "@tlh/shared-contracts";
import type { z } from "zod";
import { UuidParamPipe } from "../../common/uuid-param.pipe";
import { ZodValidationPipe } from "../../common/zod-validation.pipe";
import { type AuthContext, CurrentAuth } from "../identity/auth-context";
import { DependenciesService } from "./dependencies.service";
import { ExecutionPlansService } from "./execution-plans.service";

/** Planejamento (§36.11). */
@Controller("execution-plans")
export class ExecutionPlansController {
  constructor(private readonly plans: ExecutionPlansService) {}

  @Get()
  list(
    @CurrentAuth() auth: AuthContext,
    @Query(new ZodValidationPipe(planListQuerySchema)) query: z.output<typeof planListQuerySchema>,
  ): Promise<ExecutionPlan[]> {
    return this.plans.list(auth, query);
  }

  @Post()
  create(
    @CurrentAuth() auth: AuthContext,
    @Body(new ZodValidationPipe(createExecutionPlanSchema)) body: z.output<typeof createExecutionPlanSchema>,
  ): Promise<ExecutionPlanDetail> {
    return this.plans.create(auth, body);
  }

  @Get(":id")
  get(@CurrentAuth() auth: AuthContext, @Param("id", UuidParamPipe) id: string): Promise<ExecutionPlanDetail> {
    return this.plans.get(auth, id);
  }

  /** Exclusão definitiva; vínculos e históricos dependentes saem em cascata. */
  @Delete(":id")
  @HttpCode(204)
  remove(@CurrentAuth() auth: AuthContext, @Param("id", UuidParamPipe) id: string): Promise<void> {
    return this.plans.remove(auth, id);
  }

  @Patch(":id")
  update(
    @CurrentAuth() auth: AuthContext,
    @Param("id", UuidParamPipe) id: string,
    @Body(new ZodValidationPipe(updateExecutionPlanSchema)) body: z.output<typeof updateExecutionPlanSchema>,
  ): Promise<ExecutionPlanDetail> {
    return this.plans.update(auth, id, body);
  }
}

/** Dependências (§36.12) e acréscimos: detalhe, edição e liberação da externa. */
@Controller("work-dependencies")
export class WorkDependenciesController {
  constructor(private readonly dependencies: DependenciesService) {}

  @Get()
  list(
    @CurrentAuth() auth: AuthContext,
    @Query(new ZodValidationPipe(dependencyListQuerySchema)) query: z.output<typeof dependencyListQuerySchema>,
  ): Promise<WorkDependency[]> {
    return this.dependencies.list(auth, query);
  }

  @Post()
  create(
    @CurrentAuth() auth: AuthContext,
    @Body(new ZodValidationPipe(createWorkDependencySchema)) body: z.output<typeof createWorkDependencySchema>,
  ): Promise<WorkDependency> {
    return this.dependencies.create(auth, body);
  }

  @Get(":id")
  get(@CurrentAuth() auth: AuthContext, @Param("id", UuidParamPipe) id: string): Promise<WorkDependency> {
    return this.dependencies.get(auth, id);
  }

  @Patch(":id")
  update(
    @CurrentAuth() auth: AuthContext,
    @Param("id", UuidParamPipe) id: string,
    @Body(new ZodValidationPipe(updateWorkDependencySchema)) body: z.output<typeof updateWorkDependencySchema>,
  ): Promise<WorkDependency> {
    return this.dependencies.update(auth, id, body);
  }

  @Post(":id/release")
  @HttpCode(200)
  release(
    @CurrentAuth() auth: AuthContext,
    @Param("id", UuidParamPipe) id: string,
    @Body(new ZodValidationPipe(releaseWorkDependencySchema)) body: z.output<typeof releaseWorkDependencySchema>,
  ): Promise<WorkDependency> {
    return this.dependencies.release(auth, id, body);
  }

  @Delete(":id")
  @HttpCode(204)
  remove(@CurrentAuth() auth: AuthContext, @Param("id", UuidParamPipe) id: string): Promise<void> {
    return this.dependencies.remove(auth, id);
  }
}
