import { Body, Controller, Delete, Get, HttpCode, Param, Patch, Post, Query } from "@nestjs/common";
import {
  addReleaseItemSchema,
  createMilestoneSchema,
  type CreateReleaseResult,
  createReleaseSchema,
  type Release,
  type ReleaseDetail,
  releaseListQuerySchema,
  updateMilestoneSchema,
  updateReleaseItemSchema,
  updateReleaseSchema,
} from "@tlh/shared-contracts";
import type { z } from "zod";
import { UuidParamPipe } from "../../common/uuid-param.pipe";
import { ZodValidationPipe } from "../../common/zod-validation.pipe";
import { type AuthContext, CurrentAuth } from "../identity/auth-context";
import { ReleasesService } from "./releases.service";

/** Releases (§36.9). Escopo e marcos são acréscimos ao §36.9. */
@Controller("releases")
export class ReleasesController {
  constructor(private readonly releases: ReleasesService) {}

  @Get()
  list(
    @CurrentAuth() auth: AuthContext,
    @Query(new ZodValidationPipe(releaseListQuerySchema)) query: z.output<typeof releaseListQuerySchema>,
  ): Promise<Release[]> {
    return this.releases.list(auth, query);
  }

  @Post()
  create(
    @CurrentAuth() auth: AuthContext,
    @Body(new ZodValidationPipe(createReleaseSchema)) body: z.output<typeof createReleaseSchema>,
  ): Promise<CreateReleaseResult> {
    return this.releases.create(auth, body);
  }

  @Get(":id")
  get(@CurrentAuth() auth: AuthContext, @Param("id", UuidParamPipe) id: string): Promise<ReleaseDetail> {
    return this.releases.get(auth, id);
  }

  @Patch(":id")
  update(
    @CurrentAuth() auth: AuthContext,
    @Param("id", UuidParamPipe) id: string,
    @Body(new ZodValidationPipe(updateReleaseSchema)) body: z.output<typeof updateReleaseSchema>,
  ): Promise<ReleaseDetail> {
    return this.releases.update(auth, id, body);
  }

  @Post(":id/items")
  @HttpCode(200)
  addItem(
    @CurrentAuth() auth: AuthContext,
    @Param("id", UuidParamPipe) id: string,
    @Body(new ZodValidationPipe(addReleaseItemSchema)) body: z.output<typeof addReleaseItemSchema>,
  ): Promise<ReleaseDetail> {
    return this.releases.addItem(auth, id, body);
  }

  @Patch(":id/items/:workItemId")
  updateItem(
    @CurrentAuth() auth: AuthContext,
    @Param("id", UuidParamPipe) id: string,
    @Param("workItemId", UuidParamPipe) workItemId: string,
    @Body(new ZodValidationPipe(updateReleaseItemSchema)) body: z.output<typeof updateReleaseItemSchema>,
  ): Promise<ReleaseDetail> {
    return this.releases.updateItem(auth, id, workItemId, body);
  }

  @Post(":id/items/:workItemId/remove")
  @HttpCode(200)
  removeItem(
    @CurrentAuth() auth: AuthContext,
    @Param("id", UuidParamPipe) id: string,
    @Param("workItemId", UuidParamPipe) workItemId: string,
  ): Promise<ReleaseDetail> {
    return this.releases.removeItem(auth, id, workItemId);
  }

  @Post(":id/milestones")
  @HttpCode(200)
  addMilestone(
    @CurrentAuth() auth: AuthContext,
    @Param("id", UuidParamPipe) id: string,
    @Body(new ZodValidationPipe(createMilestoneSchema)) body: z.output<typeof createMilestoneSchema>,
  ): Promise<ReleaseDetail> {
    return this.releases.addMilestone(auth, id, body);
  }
}

@Controller("release-milestones")
export class ReleaseMilestonesController {
  constructor(private readonly releases: ReleasesService) {}

  @Patch(":id")
  update(
    @CurrentAuth() auth: AuthContext,
    @Param("id", UuidParamPipe) id: string,
    @Body(new ZodValidationPipe(updateMilestoneSchema)) body: z.output<typeof updateMilestoneSchema>,
  ): Promise<ReleaseDetail> {
    return this.releases.updateMilestone(auth, id, body);
  }

  @Delete(":id")
  remove(@CurrentAuth() auth: AuthContext, @Param("id", UuidParamPipe) id: string): Promise<ReleaseDetail> {
    return this.releases.removeMilestone(auth, id);
  }
}
