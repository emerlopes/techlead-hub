import { Injectable } from "@nestjs/common";
import type {
  ContextRef,
  createDeveloperSchema,
  Developer,
  DeveloperDetail,
  updateDeveloperSchema,
} from "@tlh/shared-contracts";
import type { z } from "zod";
import type { DeveloperStatus, Prisma } from "../../generated/prisma/client";
import { assertVersionedUpdate, changedFields, notFound } from "../../common/persistence";
import { PrismaService } from "../../infrastructure/prisma/prisma.service";
import { AuditService } from "../audit/audit.service";
import type { AuthContext } from "../identity/auth-context";
import { associationOrder, teamDeveloperInclude, toTeamDeveloperDto } from "../teams/associations.mapper";

const ENTITY = "Desenvolvedor";

const activeTeams = {
  teams: {
    where: { endedAt: null },
    select: { team: { select: { id: true, code: true, name: true } } },
    orderBy: { team: { name: "asc" } },
  },
} satisfies Prisma.DeveloperInclude;

type DeveloperRow = Prisma.DeveloperGetPayload<{ include: typeof activeTeams }>;

function toDeveloperDto(row: DeveloperRow): Developer {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    roleDescription: row.roleDescription,
    notes: row.notes,
    status: row.status,
    teams: row.teams.map((membership) => membership.team),
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    version: row.version,
  };
}

/**
 * Desenvolvedores (§10, §34.5): cadastro de referência, sem login (DEC-002). Desativar preserva
 * o histórico de participação (§10.4).
 */
@Injectable()
export class DevelopersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async list(auth: AuthContext, status?: DeveloperStatus): Promise<Developer[]> {
    const rows = await this.prisma.developer.findMany({
      where: { workspaceId: auth.workspaceId, status },
      include: activeTeams,
      orderBy: [{ status: "asc" }, { name: "asc" }],
    });
    return rows.map(toDeveloperDto);
  }

  async get(auth: AuthContext, id: string): Promise<DeveloperDetail> {
    const row = await this.prisma.developer.findFirst({
      where: { id, workspaceId: auth.workspaceId },
      include: activeTeams,
    });
    if (!row) throw notFound(ENTITY);

    const [memberships, projects] = await Promise.all([
      this.prisma.teamDeveloper.findMany({
        where: { developerId: id },
        include: teamDeveloperInclude,
        orderBy: associationOrder,
      }),
      // Projetos relacionados = projetos em que os times atuais da pessoa participam hoje.
      this.prisma.project.findMany({
        where: {
          workspaceId: auth.workspaceId,
          teams: { some: { endedAt: null, team: { developers: { some: { developerId: id, endedAt: null } } } } },
        },
        select: { id: true, code: true, name: true },
        orderBy: { name: "asc" },
      }),
    ]);

    return {
      ...toDeveloperDto(row),
      memberships: memberships.map(toTeamDeveloperDto),
      projects: projects satisfies ContextRef[],
    };
  }

  async create(auth: AuthContext, input: z.output<typeof createDeveloperSchema>): Promise<DeveloperDetail> {
    const id = await this.prisma.$transaction(async (tx) => {
      const developer = await tx.developer.create({ data: { ...input, workspaceId: auth.workspaceId } });
      await this.audit.record(
        { action: "developer.created", entityType: "developer", entityId: developer.id, workspaceId: auth.workspaceId, actorUserId: auth.userId },
        tx,
      );
      return developer.id;
    });
    return this.get(auth, id);
  }

  async update(
    auth: AuthContext,
    id: string,
    input: z.output<typeof updateDeveloperSchema>,
  ): Promise<DeveloperDetail> {
    const { version, ...changes } = input;
    await this.prisma.$transaction(async (tx) => {
      const result = await tx.developer.updateMany({
        where: { id, workspaceId: auth.workspaceId, version },
        data: { ...changes, version: { increment: 1 } },
      });
      await assertVersionedUpdate(
        result.count,
        () => tx.developer.findFirst({ where: { id, workspaceId: auth.workspaceId }, select: { id: true } }),
        ENTITY,
      );
      // Somente os nomes dos campos: e-mail e anotações são dados pessoais (§44.5).
      await this.audit.record(
        {
          action: "developer.updated",
          entityType: "developer",
          entityId: id,
          workspaceId: auth.workspaceId,
          actorUserId: auth.userId,
          metadata: { fields: changedFields(changes), fromVersion: version, status: changes.status ?? null },
        },
        tx,
      );
    });
    return this.get(auth, id);
  }

  async remove(auth: AuthContext, id: string): Promise<void> {
    await this.audit.deleteEntity(
      { entityType: "developer", entityId: id, workspaceId: auth.workspaceId, actorUserId: auth.userId, label: ENTITY },
      (tx) => tx.developer.deleteMany({ where: { id, workspaceId: auth.workspaceId } }),
    );
  }
}
