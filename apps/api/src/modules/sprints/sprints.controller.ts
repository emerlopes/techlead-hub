import { Body, Controller, Delete, Get, HttpCode, Param, Patch, Post, Query } from "@nestjs/common";
import {
  addSprintItemSchema,
  closeSprintSchema,
  createSprintSchema,
  type Sprint,
  type SprintDetail,
  sprintListQuerySchema,
  startSprintSchema,
  updateSprintSchema,
} from "@tlh/shared-contracts";
import type { z } from "zod";
import { UuidParamPipe } from "../../common/uuid-param.pipe";
import { ZodValidationPipe } from "../../common/zod-validation.pipe";
import { type AuthContext, CurrentAuth } from "../identity/auth-context";
import { SprintsService } from "./sprints.service";

/** Sprints (§36.8). Escopo por `/sprints/{id}/items` (acréscimo ao §36.8). */
@Controller("sprints")
export class SprintsController {
  constructor(private readonly sprints: SprintsService) {}

  @Get()
  list(
    @CurrentAuth() auth: AuthContext,
    @Query(new ZodValidationPipe(sprintListQuerySchema)) query: z.output<typeof sprintListQuerySchema>,
  ): Promise<Sprint[]> {
    return this.sprints.list(auth, query);
  }

  @Post()
  create(
    @CurrentAuth() auth: AuthContext,
    @Body(new ZodValidationPipe(createSprintSchema)) body: z.output<typeof createSprintSchema>,
  ): Promise<SprintDetail> {
    return this.sprints.create(auth, body);
  }

  @Get(":id")
  get(@CurrentAuth() auth: AuthContext, @Param("id", UuidParamPipe) id: string): Promise<SprintDetail> {
    return this.sprints.get(auth, id);
  }

  /** Exclusão definitiva; vínculos e históricos dependentes saem em cascata. */
  @Delete(":id")
  @HttpCode(204)
  remove(@CurrentAuth() auth: AuthContext, @Param("id", UuidParamPipe) id: string): Promise<void> {
    return this.sprints.remove(auth, id);
  }

  @Patch(":id")
  update(
    @CurrentAuth() auth: AuthContext,
    @Param("id", UuidParamPipe) id: string,
    @Body(new ZodValidationPipe(updateSprintSchema)) body: z.output<typeof updateSprintSchema>,
  ): Promise<SprintDetail> {
    return this.sprints.update(auth, id, body);
  }

  /** Acréscimo ao §36.8: iniciar confirmando nome e objetivo. */
  @Post(":id/start")
  @HttpCode(200)
  start(
    @CurrentAuth() auth: AuthContext,
    @Param("id", UuidParamPipe) id: string,
    @Body(new ZodValidationPipe(startSprintSchema)) body: z.output<typeof startSprintSchema>,
  ): Promise<SprintDetail> {
    return this.sprints.start(auth, id, body);
  }

  @Post(":id/close")
  @HttpCode(200)
  close(
    @CurrentAuth() auth: AuthContext,
    @Param("id", UuidParamPipe) id: string,
    @Body(new ZodValidationPipe(closeSprintSchema)) body: z.output<typeof closeSprintSchema>,
  ): Promise<SprintDetail> {
    return this.sprints.close(auth, id, body);
  }

  @Post(":id/items")
  @HttpCode(200)
  addItem(
    @CurrentAuth() auth: AuthContext,
    @Param("id", UuidParamPipe) id: string,
    @Body(new ZodValidationPipe(addSprintItemSchema)) body: z.output<typeof addSprintItemSchema>,
  ): Promise<SprintDetail> {
    return this.sprints.addItem(auth, id, body);
  }

  @Post(":id/items/:workItemId/remove")
  @HttpCode(200)
  removeItem(
    @CurrentAuth() auth: AuthContext,
    @Param("id", UuidParamPipe) id: string,
    @Param("workItemId", UuidParamPipe) workItemId: string,
  ): Promise<SprintDetail> {
    return this.sprints.removeItem(auth, id, workItemId);
  }
}
