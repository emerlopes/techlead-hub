import { Injectable } from "@nestjs/common";
import type {
  createTeamDeveloperSchema,
  createTeamProjectSchema,
  TeamDeveloper,
  TeamProject,
} from "@tlh/shared-contracts";
import type { z } from "zod";
import { ApiException } from "../../common/api-exception";
import { isUniqueViolation, notFound, ruleViolation } from "../../common/persistence";
import { PrismaService } from "../../infrastructure/prisma/prisma.service";
import { AuditService } from "../audit/audit.service";
import type { AuthContext } from "../identity/auth-context";
import {
  teamDeveloperInclude,
  teamProjectInclude,
  toTeamDeveloperDto,
  toTeamProjectDto,
} from "./associations.mapper";

/**
 * Associações time ↔ projeto e time ↔ desenvolvedor (§9). Nunca são apagadas: encerrar registra
 * `ended_at` e mantém o período de participação para relatórios históricos (§9.2, RN-025).
 */
@Injectable()
export class AssociationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async createTeamProject(
    auth: AuthContext,
    input: z.output<typeof createTeamProjectSchema>,
  ): Promise<TeamProject> {
    const [team, project] = await Promise.all([
      this.prisma.team.findFirst({ where: { id: input.teamId, workspaceId: auth.workspaceId } }),
      this.prisma.project.findFirst({ where: { id: input.projectId, workspaceId: auth.workspaceId } }),
    ]);
    if (!team) throw notFound("Time");
    if (!project) throw notFound("Projeto");
    if (team.status !== "ACTIVE") throw ruleViolation("Times inativos não recebem novas associações (§7.4).", "teamId");
    // Projetos arquivados não aceitam novos planejamentos por padrão (§8.5).
    if (project.status === "ARCHIVED") {
      throw ruleViolation("Projetos arquivados não recebem novos times (§8.5).", "projectId");
    }

    try {
      return await this.prisma.$transaction(async (tx) => {
        const row = await tx.teamProject.create({ data: input, include: teamProjectInclude });
        await this.audit.record(
          {
            action: "team_project.created",
            entityType: "team_project",
            entityId: row.id,
            workspaceId: auth.workspaceId,
            actorUserId: auth.userId,
            metadata: { teamId: input.teamId, projectId: input.projectId, isPrimary: input.isPrimary },
          },
          tx,
        );
        return toTeamProjectDto(row);
      });
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw new ApiException(409, "CONFLICT", "Este time já participa deste projeto (§9.2).");
      }
      throw error;
    }
  }

  async endTeamProject(auth: AuthContext, id: string): Promise<TeamProject> {
    return this.prisma.$transaction(async (tx) => {
      const result = await tx.teamProject.updateMany({
        where: { id, endedAt: null, team: { workspaceId: auth.workspaceId } },
        data: { endedAt: new Date() },
      });
      const row = await tx.teamProject.findFirst({
        where: { id, team: { workspaceId: auth.workspaceId } },
        include: teamProjectInclude,
      });
      if (!row) throw notFound("Associação");
      if (result.count === 0) throw ruleViolation("Esta participação já foi encerrada.");
      await this.audit.record(
        {
          action: "team_project.ended",
          entityType: "team_project",
          entityId: id,
          workspaceId: auth.workspaceId,
          actorUserId: auth.userId,
          metadata: { teamId: row.team.id, projectId: row.project.id },
        },
        tx,
      );
      return toTeamProjectDto(row);
    });
  }

  async createTeamDeveloper(
    auth: AuthContext,
    input: z.output<typeof createTeamDeveloperSchema>,
  ): Promise<TeamDeveloper> {
    const [team, developer] = await Promise.all([
      this.prisma.team.findFirst({ where: { id: input.teamId, workspaceId: auth.workspaceId } }),
      this.prisma.developer.findFirst({ where: { id: input.developerId, workspaceId: auth.workspaceId } }),
    ]);
    if (!team) throw notFound("Time");
    if (!developer) throw notFound("Desenvolvedor");
    if (team.status !== "ACTIVE") throw ruleViolation("Times inativos não recebem novas associações (§7.4).", "teamId");
    if (developer.status !== "ACTIVE") {
      throw ruleViolation("Desenvolvedores inativos não entram em novos times (§10.2).", "developerId");
    }

    try {
      return await this.prisma.$transaction(async (tx) => {
        const row = await tx.teamDeveloper.create({ data: input, include: teamDeveloperInclude });
        await this.audit.record(
          {
            action: "team_developer.created",
            entityType: "team_developer",
            entityId: row.id,
            workspaceId: auth.workspaceId,
            actorUserId: auth.userId,
            metadata: { teamId: input.teamId, developerId: input.developerId },
          },
          tx,
        );
        return toTeamDeveloperDto(row);
      });
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw new ApiException(409, "CONFLICT", "Este desenvolvedor já participa deste time (§9.3).");
      }
      throw error;
    }
  }

  async endTeamDeveloper(auth: AuthContext, id: string): Promise<TeamDeveloper> {
    return this.prisma.$transaction(async (tx) => {
      const result = await tx.teamDeveloper.updateMany({
        where: { id, endedAt: null, team: { workspaceId: auth.workspaceId } },
        data: { endedAt: new Date() },
      });
      const row = await tx.teamDeveloper.findFirst({
        where: { id, team: { workspaceId: auth.workspaceId } },
        include: teamDeveloperInclude,
      });
      if (!row) throw notFound("Associação");
      if (result.count === 0) throw ruleViolation("Esta participação já foi encerrada.");
      await this.audit.record(
        {
          action: "team_developer.ended",
          entityType: "team_developer",
          entityId: id,
          workspaceId: auth.workspaceId,
          actorUserId: auth.userId,
          metadata: { teamId: row.team.id, developerId: row.developer.id },
        },
        tx,
      );
      return toTeamDeveloperDto(row);
    });
  }
}
