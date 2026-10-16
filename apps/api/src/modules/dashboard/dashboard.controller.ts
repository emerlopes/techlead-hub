import { Controller, Get, Query } from "@nestjs/common";
import { type Dashboard, dashboardQuerySchema, type DashboardQuery } from "@tlh/shared-contracts";
import { ZodValidationPipe } from "../../common/zod-validation.pipe";
import { type AuthContext, CurrentAuth } from "../identity/auth-context";
import { DashboardService } from "./dashboard.service";

/** Acréscimo ao §36: visão consolidada do dashboard (§5) em uma única chamada. */
@Controller("dashboard")
export class DashboardController {
  constructor(private readonly dashboard: DashboardService) {}

  @Get()
  get(
    @CurrentAuth() auth: AuthContext,
    @Query(new ZodValidationPipe(dashboardQuerySchema)) query: DashboardQuery,
  ): Promise<Dashboard> {
    return this.dashboard.get(auth, query);
  }
}
