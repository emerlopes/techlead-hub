import { Body, Controller, Delete, Get, HttpCode, Param, Patch, Post, Query } from "@nestjs/common";
import {
  createRiskSchema,
  type Risk,
  type RiskDetail,
  riskListQuerySchema,
  updateRiskSchema,
} from "@tlh/shared-contracts";
import type { z } from "zod";
import { UuidParamPipe } from "../../common/uuid-param.pipe";
import { ZodValidationPipe } from "../../common/zod-validation.pipe";
import { type AuthContext, CurrentAuth } from "../identity/auth-context";
import { RisksService } from "./risks.service";

/** Riscos e impedimentos (§16). Acréscimo ao §36; resolver via `PATCH { status }`. */
@Controller("risks")
export class RisksController {
  constructor(private readonly risks: RisksService) {}

  @Get()
  list(
    @CurrentAuth() auth: AuthContext,
    @Query(new ZodValidationPipe(riskListQuerySchema)) query: z.output<typeof riskListQuerySchema>,
  ): Promise<Risk[]> {
    return this.risks.list(auth, query);
  }

  @Post()
  create(
    @CurrentAuth() auth: AuthContext,
    @Body(new ZodValidationPipe(createRiskSchema)) body: z.output<typeof createRiskSchema>,
  ): Promise<RiskDetail> {
    return this.risks.create(auth, body);
  }

  @Get(":id")
  get(@CurrentAuth() auth: AuthContext, @Param("id", UuidParamPipe) id: string): Promise<RiskDetail> {
    return this.risks.get(auth, id);
  }

  /** Exclusão definitiva; vínculos e históricos dependentes saem em cascata. */
  @Delete(":id")
  @HttpCode(204)
  remove(@CurrentAuth() auth: AuthContext, @Param("id", UuidParamPipe) id: string): Promise<void> {
    return this.risks.remove(auth, id);
  }

  @Patch(":id")
  update(
    @CurrentAuth() auth: AuthContext,
    @Param("id", UuidParamPipe) id: string,
    @Body(new ZodValidationPipe(updateRiskSchema)) body: z.output<typeof updateRiskSchema>,
  ): Promise<RiskDetail> {
    return this.risks.update(auth, id, body);
  }
}
