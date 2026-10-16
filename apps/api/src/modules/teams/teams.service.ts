import { Injectable } from "@nestjs/common";
import type { createTeamSchema, Team, TeamDetail, updateTeamSchema } from "@tlh/shared-contracts";
import type { z } from "zod";
import type { Prisma, TeamStatus } from "../../generated/prisma/client";
import {
  assertVersionedUpdate,
  changedFields,
  duplicateCode,
  isUniqueViolation,
  notFound,
} from "../../common/persistence";
import { PrismaService } from "../../infrastructure/prisma/prisma.service";
import { AuditService } from "../audit/audit.service";
import type { AuthContext } from "../identity/auth-context";
import {
  associationOrder,
  teamDeveloperInclude,
  teamProjectInclude,
  toTeamDeveloperDto,
  toTeamProjectDto,
} from "./associations.mapper";

const ENTITY = "Time";

const teamCounts = {
  _count: {
    select: {
      projects: { where: { endedAt: null } },
      developers: { where: { endedAt: null } },
    },
  },
} satisfies Prisma.TeamInclude;

type TeamRow = Prisma.TeamGetPayload<{ include: typeof teamCounts }>;

function toTeamDto(row: TeamRow): Team {
  return {
    id: row.id,
    name: row.name,
    code: row.code,
    description: row.description,
    status: row.status,
    activeProjectCount: row._count.projects,
    activeDeveloperCount: row._count.developers,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    version: row.version,
  };
}

/** Times (§7, §34.3). Desativar não apaga histórico (RN-022). */
@Injectable()
export class TeamsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async list(auth: AuthContext, status?: TeamStatus): Promise<Team[]> {
    const rows = await this.prisma.team.findMany({
      where: { workspaceId: auth.workspaceId, status },
      include: teamCounts,
      orderBy: [{ status: "asc" }, { name: "asc" }],
    });
    return rows.map(toTeamDto);
  }

  async get(auth: AuthContext, id: string): Promise<TeamDetail> {
    const row = await this.prisma.team.findFirst({
      where: { id, workspaceId: auth.workspaceId },
      include: {
        ...teamCounts,
        projects: { include: teamProjectInclude, orderBy: associationOrder },
        developers: { include: teamDeveloperInclude, orderBy: associationOrder },
      },
    });
    if (!row) throw notFound(ENTITY);
    return {
      ...toTeamDto(row),
      projects: row.projects.map(toTeamProjectDto),
      developers: row.developers.map(toTeamDeveloperDto),
    };
  }

  async create(auth: AuthContext, input: z.output<typeof createTeamSchema>): Promise<TeamDetail> {
    const id = await this.prisma
      .$transaction(async (tx) => {
        const team = await tx.team.create({ data: { ...input, workspaceId: auth.workspaceId } });
        await this.audit.record(
          { action: "team.created", entityType: "team", entityId: team.id, workspaceId: auth.workspaceId, actorUserId: auth.userId },
          tx,
        );
        return team.id;
      })
      .catch((error: unknown) => {
        throw isUniqueViolation(error) ? duplicateCode(input.code) : error;
      });
    return this.get(auth, id);
  }

  async update(auth: AuthContext, id: string, input: z.output<typeof updateTeamSchema>): Promise<TeamDetail> {
    const { version, ...changes } = input;
    await this.prisma
      .$transaction(async (tx) => {
        const result = await tx.team.updateMany({
          where: { id, workspaceId: auth.workspaceId, version },
          data: { ...changes, version: { increment: 1 } },
        });
        await assertVersionedUpdate(
          result.count,
          () => tx.team.findFirst({ where: { id, workspaceId: auth.workspaceId }, select: { id: true } }),
          ENTITY,
        );
        await this.audit.record(
          {
            action: "team.updated",
            entityType: "team",
            entityId: id,
            workspaceId: auth.workspaceId,
            actorUserId: auth.userId,
            metadata: { fields: changedFields(changes), fromVersion: version, status: changes.status ?? null },
          },
          tx,
        );
      })
      .catch((error: unknown) => {
        throw isUniqueViolation(error) && changes.code ? duplicateCode(changes.code) : error;
      });
    return this.get(auth, id);
  }
}
