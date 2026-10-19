import { Body, Controller, Get, HttpCode, Param, Post, Query } from "@nestjs/common";
import {
  type CapacityReport,
  capacityReportQuerySchema,
  generateReportSchema,
  type ReleaseReport,
  type ReportDraft,
  type SprintReport,
} from "@tlh/shared-contracts";
import type { z } from "zod";
import { UuidParamPipe } from "../../common/uuid-param.pipe";
import { ZodValidationPipe } from "../../common/zod-validation.pipe";
import { type AuthContext, CurrentAuth } from "../identity/auth-context";
import { ReportsService } from "./reports.service";

/** Relatórios (§36.16). */
@Controller("reports")
export class ReportsController {
  constructor(private readonly reports: ReportsService) {}

  @Get("sprints/:id")
  sprint(@CurrentAuth() auth: AuthContext, @Param("id", UuidParamPipe) id: string): Promise<SprintReport> {
    return this.reports.sprint(auth, id);
  }

  @Get("releases/:id")
  release(@CurrentAuth() auth: AuthContext, @Param("id", UuidParamPipe) id: string): Promise<ReleaseReport> {
    return this.reports.release(auth, id);
  }

  @Get("capacity")
  capacity(
    @CurrentAuth() auth: AuthContext,
    @Query(new ZodValidationPipe(capacityReportQuerySchema)) query: z.output<typeof capacityReportQuerySchema>,
  ): Promise<CapacityReport> {
    return this.reports.capacityReport(auth, query);
  }

  /** Gera o rascunho sem persistir nem alterar dados: nada a auditar. */
  @Post("generate")
  @HttpCode(200)
  generate(
    @CurrentAuth() auth: AuthContext,
    @Body(new ZodValidationPipe(generateReportSchema)) body: z.output<typeof generateReportSchema>,
  ): Promise<ReportDraft> {
    return this.reports.generate(auth, body);
  }
}
