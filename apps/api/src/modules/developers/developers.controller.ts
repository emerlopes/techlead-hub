import { Body, Controller, Get, Param, Patch, Post, Query } from "@nestjs/common";
import {
  createDeveloperSchema,
  type Developer,
  type DeveloperDetail,
  developerStatuses,
  statusFilterSchema,
  updateDeveloperSchema,
} from "@tlh/shared-contracts";
import type { z } from "zod";
import { UuidParamPipe } from "../../common/uuid-param.pipe";
import { ZodValidationPipe } from "../../common/zod-validation.pipe";
import { type AuthContext, CurrentAuth } from "../identity/auth-context";
import { DevelopersService } from "./developers.service";

const developerFilter = statusFilterSchema(developerStatuses);

/** Desenvolvedores (§36.5). Capacidade e ausências chegam na Etapa 4. */
@Controller("developers")
export class DevelopersController {
  constructor(private readonly developers: DevelopersService) {}

  @Get()
  list(
    @CurrentAuth() auth: AuthContext,
    @Query(new ZodValidationPipe(developerFilter)) query: z.output<typeof developerFilter>,
  ): Promise<Developer[]> {
    return this.developers.list(auth, query.status);
  }

  @Post()
  create(
    @CurrentAuth() auth: AuthContext,
    @Body(new ZodValidationPipe(createDeveloperSchema)) body: z.output<typeof createDeveloperSchema>,
  ): Promise<DeveloperDetail> {
    return this.developers.create(auth, body);
  }

  @Get(":id")
  get(@CurrentAuth() auth: AuthContext, @Param("id", UuidParamPipe) id: string): Promise<DeveloperDetail> {
    return this.developers.get(auth, id);
  }

  @Patch(":id")
  update(
    @CurrentAuth() auth: AuthContext,
    @Param("id", UuidParamPipe) id: string,
    @Body(new ZodValidationPipe(updateDeveloperSchema)) body: z.output<typeof updateDeveloperSchema>,
  ): Promise<DeveloperDetail> {
    return this.developers.update(auth, id, body);
  }
}
