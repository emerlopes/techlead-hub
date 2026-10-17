import { Injectable } from "@nestjs/common";
import type { createProjectSchema, Project, ProjectDetail, updateProjectSchema } from "@tlh/shared-contracts";
import type { z } from "zod";
import type { Prisma, ProjectStatus } from "../../generated/prisma/client";
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
import { associationOrder, teamProjectInclude, toTeamProjectDto } from "../teams/associations.mapper";

const ENTITY = "Projeto";

const projectCounts = {
  _count: { select: { teams: { where: { endedAt: null } } } },
} satisfies Prisma.ProjectInclude;

type ProjectRow = Prisma.ProjectGetPayload<{ include: typeof projectCounts }>;

function toProjectDto(row: ProjectRow): Project {
  return {
    id: row.id,
    name: row.name,
    code: row.code,
    description: row.description,
    status: row.status,
    activeTeamCount: row._count.teams,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    version: row.version,
  };
}

/** Projetos (§8, §34.4). Arquivar preserva histórico e mantém o projeto consultável (RN-024). */
@Injectable()
export class ProjectsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async list(auth: AuthContext, status?: ProjectStatus): Promise<Project[]> {
    const rows = await this.prisma.project.findMany({
      where: { workspaceId: auth.workspaceId, status },
      include: projectCounts,
      orderBy: [{ status: "asc" }, { name: "asc" }],
    });
    return rows.map(toProjectDto);
  }

  async get(auth: AuthContext, id: string): Promise<ProjectDetail> {
    const row = await this.prisma.project.findFirst({
      where: { id, workspaceId: auth.workspaceId },
      include: { ...projectCounts, teams: { include: teamProjectInclude, orderBy: associationOrder } },
    });
    if (!row) throw notFound(ENTITY);
    return { ...toProjectDto(row), teams: row.teams.map(toTeamProjectDto) };
  }

  async create(auth: AuthContext, input: z.output<typeof createProjectSchema>): Promise<ProjectDetail> {
    const id = await this.prisma
      .$transaction(async (tx) => {
        const project = await tx.project.create({ data: { ...input, workspaceId: auth.workspaceId } });
        await this.audit.record(
          { action: "project.created", entityType: "project", entityId: project.id, workspaceId: auth.workspaceId, actorUserId: auth.userId },
          tx,
        );
        return project.id;
      })
      .catch((error: unknown) => {
        throw isUniqueViolation(error) ? duplicateCode(input.code) : error;
      });
    return this.get(auth, id);
  }

  async update(auth: AuthContext, id: string, input: z.output<typeof updateProjectSchema>): Promise<ProjectDetail> {
    const { version, ...changes } = input;
    await this.prisma
      .$transaction(async (tx) => {
        const result = await tx.project.updateMany({
          where: { id, workspaceId: auth.workspaceId, version },
          data: { ...changes, version: { increment: 1 } },
        });
        await assertVersionedUpdate(
          result.count,
          () => tx.project.findFirst({ where: { id, workspaceId: auth.workspaceId }, select: { id: true } }),
          ENTITY,
        );
        await this.audit.record(
          {
            action: "project.updated",
            entityType: "project",
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

  async remove(auth: AuthContext, id: string): Promise<void> {
    await this.audit.deleteEntity(
      { entityType: "project", entityId: id, workspaceId: auth.workspaceId, actorUserId: auth.userId, label: ENTITY },
      (tx) => tx.project.deleteMany({ where: { id, workspaceId: auth.workspaceId } }),
    );
  }
}
