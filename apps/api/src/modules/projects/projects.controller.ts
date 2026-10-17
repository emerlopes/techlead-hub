import { Body, Controller, Delete, Get, HttpCode, Param, Patch, Post, Query } from "@nestjs/common";
import {
  createProjectSchema,
  type Project,
  type ProjectDetail,
  projectStatuses,
  statusFilterSchema,
  updateProjectSchema,
} from "@tlh/shared-contracts";
import type { z } from "zod";
import { UuidParamPipe } from "../../common/uuid-param.pipe";
import { ZodValidationPipe } from "../../common/zod-validation.pipe";
import { type AuthContext, CurrentAuth } from "../identity/auth-context";
import { ProjectsService } from "./projects.service";

const projectFilter = statusFilterSchema(projectStatuses);

/** Projetos (§36.4). Pausar, arquivar e reativar via `PATCH` com `status`. */
@Controller("projects")
export class ProjectsController {
  constructor(private readonly projects: ProjectsService) {}

  @Get()
  list(
    @CurrentAuth() auth: AuthContext,
    @Query(new ZodValidationPipe(projectFilter)) query: z.output<typeof projectFilter>,
  ): Promise<Project[]> {
    return this.projects.list(auth, query.status);
  }

  @Post()
  create(
    @CurrentAuth() auth: AuthContext,
    @Body(new ZodValidationPipe(createProjectSchema)) body: z.output<typeof createProjectSchema>,
  ): Promise<ProjectDetail> {
    return this.projects.create(auth, body);
  }

  @Get(":id")
  get(@CurrentAuth() auth: AuthContext, @Param("id", UuidParamPipe) id: string): Promise<ProjectDetail> {
    return this.projects.get(auth, id);
  }

  /** Exclusão definitiva; vínculos e históricos dependentes saem em cascata. */
  @Delete(":id")
  @HttpCode(204)
  remove(@CurrentAuth() auth: AuthContext, @Param("id", UuidParamPipe) id: string): Promise<void> {
    return this.projects.remove(auth, id);
  }

  @Patch(":id")
  update(
    @CurrentAuth() auth: AuthContext,
    @Param("id", UuidParamPipe) id: string,
    @Body(new ZodValidationPipe(updateProjectSchema)) body: z.output<typeof updateProjectSchema>,
  ): Promise<ProjectDetail> {
    return this.projects.update(auth, id, body);
  }
}
