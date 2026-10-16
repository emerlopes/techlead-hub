import { Body, Controller, Get, HttpCode, Param, Patch, Post, Query } from "@nestjs/common";
import {
  createTeamDeveloperSchema,
  createTeamProjectSchema,
  createTeamSchema,
  statusFilterSchema,
  type Team,
  type TeamDetail,
  type TeamDeveloper,
  type TeamProject,
  teamStatuses,
  updateTeamSchema,
} from "@tlh/shared-contracts";
import type { z } from "zod";
import { UuidParamPipe } from "../../common/uuid-param.pipe";
import { ZodValidationPipe } from "../../common/zod-validation.pipe";
import { type AuthContext, CurrentAuth } from "../identity/auth-context";
import { AssociationsService } from "./associations.service";
import { TeamsService } from "./teams.service";

const teamFilter = statusFilterSchema(teamStatuses);

/** Times (§36.3). Ativar/desativar via `PATCH` com `status`. */
@Controller("teams")
export class TeamsController {
  constructor(private readonly teams: TeamsService) {}

  @Get()
  list(
    @CurrentAuth() auth: AuthContext,
    @Query(new ZodValidationPipe(teamFilter)) query: z.output<typeof teamFilter>,
  ): Promise<Team[]> {
    return this.teams.list(auth, query.status);
  }

  @Post()
  create(
    @CurrentAuth() auth: AuthContext,
    @Body(new ZodValidationPipe(createTeamSchema)) body: z.output<typeof createTeamSchema>,
  ): Promise<TeamDetail> {
    return this.teams.create(auth, body);
  }

  @Get(":id")
  get(@CurrentAuth() auth: AuthContext, @Param("id", UuidParamPipe) id: string): Promise<TeamDetail> {
    return this.teams.get(auth, id);
  }

  @Patch(":id")
  update(
    @CurrentAuth() auth: AuthContext,
    @Param("id", UuidParamPipe) id: string,
    @Body(new ZodValidationPipe(updateTeamSchema)) body: z.output<typeof updateTeamSchema>,
  ): Promise<TeamDetail> {
    return this.teams.update(auth, id, body);
  }
}

/** Participação de times em projetos (§9.1). */
@Controller("team-projects")
export class TeamProjectsController {
  constructor(private readonly associations: AssociationsService) {}

  @Post()
  create(
    @CurrentAuth() auth: AuthContext,
    @Body(new ZodValidationPipe(createTeamProjectSchema)) body: z.output<typeof createTeamProjectSchema>,
  ): Promise<TeamProject> {
    return this.associations.createTeamProject(auth, body);
  }

  @Post(":id/end")
  @HttpCode(200)
  end(@CurrentAuth() auth: AuthContext, @Param("id", UuidParamPipe) id: string): Promise<TeamProject> {
    return this.associations.endTeamProject(auth, id);
  }
}

/** Participação de desenvolvedores em times (§9.3). */
@Controller("team-developers")
export class TeamDevelopersController {
  constructor(private readonly associations: AssociationsService) {}

  @Post()
  create(
    @CurrentAuth() auth: AuthContext,
    @Body(new ZodValidationPipe(createTeamDeveloperSchema)) body: z.output<typeof createTeamDeveloperSchema>,
  ): Promise<TeamDeveloper> {
    return this.associations.createTeamDeveloper(auth, body);
  }

  @Post(":id/end")
  @HttpCode(200)
  end(@CurrentAuth() auth: AuthContext, @Param("id", UuidParamPipe) id: string): Promise<TeamDeveloper> {
    return this.associations.endTeamDeveloper(auth, id);
  }
}
