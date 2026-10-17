import { Body, Controller, Delete, Get, HttpCode, Param, Patch, Post, Query } from "@nestjs/common";
import {
  createCheckItemSchema,
  createEstimateSchema,
  createExternalSourceSchema,
  createWorkItemSchema,
  type ExternalSource,
  type Paginated,
  type RefinementPipelineItem,
  refinementListQuerySchema,
  updateCheckItemSchema,
  updateExternalSourceSchema,
  updateRefinementSchema,
  updateWorkItemSchema,
  type WorkItem,
  type WorkItemDetail,
  workItemListQuerySchema,
} from "@tlh/shared-contracts";
import type { z } from "zod";
import { UuidParamPipe } from "../../common/uuid-param.pipe";
import { ZodValidationPipe } from "../../common/zod-validation.pipe";
import { type AuthContext, CurrentAuth } from "../identity/auth-context";
import { ExternalSourcesService } from "./external-sources.service";
import { RefinementsService } from "./refinements.service";
import { WorkItemsService } from "./work-items.service";

/** Histórias externas e acompanhamento (§36.7). */
@Controller("work-items")
export class WorkItemsController {
  constructor(
    private readonly workItems: WorkItemsService,
    private readonly refinements: RefinementsService,
  ) {}

  @Get()
  list(
    @CurrentAuth() auth: AuthContext,
    @Query(new ZodValidationPipe(workItemListQuerySchema)) query: z.output<typeof workItemListQuerySchema>,
  ): Promise<Paginated<WorkItem>> {
    return this.workItems.list(auth, query);
  }

  @Post()
  create(
    @CurrentAuth() auth: AuthContext,
    @Body(new ZodValidationPipe(createWorkItemSchema)) body: z.output<typeof createWorkItemSchema>,
  ): Promise<WorkItemDetail> {
    return this.workItems.create(auth, body);
  }

  @Get(":id")
  get(@CurrentAuth() auth: AuthContext, @Param("id", UuidParamPipe) id: string): Promise<WorkItemDetail> {
    return this.workItems.get(auth, id);
  }

  /** Exclusão definitiva; vínculos e históricos dependentes saem em cascata. */
  @Delete(":id")
  @HttpCode(204)
  remove(@CurrentAuth() auth: AuthContext, @Param("id", UuidParamPipe) id: string): Promise<void> {
    return this.workItems.remove(auth, id);
  }

  @Patch(":id")
  update(
    @CurrentAuth() auth: AuthContext,
    @Param("id", UuidParamPipe) id: string,
    @Body(new ZodValidationPipe(updateWorkItemSchema)) body: z.output<typeof updateWorkItemSchema>,
  ): Promise<WorkItemDetail> {
    return this.workItems.update(auth, id, body);
  }

  /** Acréscimo ao §36.7: registrar verificação sem alterar dados (§14.2). */
  @Post(":id/check")
  @HttpCode(200)
  check(@CurrentAuth() auth: AuthContext, @Param("id", UuidParamPipe) id: string): Promise<WorkItemDetail> {
    return this.workItems.check(auth, id);
  }

  /** Estimativa ou revisão (§21). Acréscimo ao §36.7. */
  @Post(":id/estimates")
  addEstimate(
    @CurrentAuth() auth: AuthContext,
    @Param("id", UuidParamPipe) id: string,
    @Body(new ZodValidationPipe(createEstimateSchema)) body: z.output<typeof createEstimateSchema>,
  ): Promise<WorkItemDetail> {
    return this.workItems.addEstimate(auth, id, body);
  }

  @Patch(":id/refinement")
  updateRefinement(
    @CurrentAuth() auth: AuthContext,
    @Param("id", UuidParamPipe) id: string,
    @Body(new ZodValidationPipe(updateRefinementSchema)) body: z.output<typeof updateRefinementSchema>,
  ): Promise<WorkItemDetail> {
    return this.refinements.update(auth, id, body);
  }

  @Post(":id/refinement/check-items")
  @HttpCode(200)
  addCheckItem(
    @CurrentAuth() auth: AuthContext,
    @Param("id", UuidParamPipe) id: string,
    @Body(new ZodValidationPipe(createCheckItemSchema)) body: z.output<typeof createCheckItemSchema>,
  ): Promise<WorkItemDetail> {
    return this.refinements.addCheckItem(auth, id, body);
  }
}

/** Pipeline de refinamento (§15.2). */
@Controller("refinements")
export class RefinementsController {
  constructor(private readonly refinements: RefinementsService) {}

  @Get()
  pipeline(
    @CurrentAuth() auth: AuthContext,
    @Query(new ZodValidationPipe(refinementListQuerySchema)) query: z.output<typeof refinementListQuerySchema>,
  ): Promise<RefinementPipelineItem[]> {
    return this.refinements.pipeline(auth, query);
  }
}

@Controller("refinement-check-items")
export class RefinementCheckItemsController {
  constructor(private readonly refinements: RefinementsService) {}

  @Patch(":id")
  update(
    @CurrentAuth() auth: AuthContext,
    @Param("id", UuidParamPipe) id: string,
    @Body(new ZodValidationPipe(updateCheckItemSchema)) body: z.output<typeof updateCheckItemSchema>,
  ): Promise<WorkItemDetail> {
    return this.refinements.updateCheckItem(auth, id, body);
  }

  @Delete(":id")
  remove(@CurrentAuth() auth: AuthContext, @Param("id", UuidParamPipe) id: string): Promise<WorkItemDetail> {
    return this.refinements.removeCheckItem(auth, id);
  }
}

/** Origens dos itens externos (§13.3). */
@Controller("external-sources")
export class ExternalSourcesController {
  constructor(private readonly sources: ExternalSourcesService) {}

  @Get()
  list(@CurrentAuth() auth: AuthContext): Promise<ExternalSource[]> {
    return this.sources.list(auth);
  }

  @Post()
  create(
    @CurrentAuth() auth: AuthContext,
    @Body(new ZodValidationPipe(createExternalSourceSchema)) body: z.output<typeof createExternalSourceSchema>,
  ): Promise<ExternalSource[]> {
    return this.sources.create(auth, body);
  }

  @Patch(":id")
  update(
    @CurrentAuth() auth: AuthContext,
    @Param("id", UuidParamPipe) id: string,
    @Body(new ZodValidationPipe(updateExternalSourceSchema)) body: z.output<typeof updateExternalSourceSchema>,
  ): Promise<ExternalSource[]> {
    return this.sources.update(auth, id, body);
  }
}
