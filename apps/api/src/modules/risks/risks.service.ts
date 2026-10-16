import { Injectable } from "@nestjs/common";
import {
  type createRiskSchema,
  OPEN_RISK_STATUSES,
  type Risk,
  type RiskDetail,
  type riskListQuerySchema,
  type RiskSeverityValue,
  type updateRiskSchema,
} from "@tlh/shared-contracts";
import type { z } from "zod";
import type { Prisma, RiskStatus } from "../../generated/prisma/client";
import { workspaceToday } from "../../common/context-rules";
import { assertLinkTargets, type LinkInput, linkChanges } from "../../common/link-targets";
import { changedFields, fromIsoDate, notFound, toIsoDate, toIsoOrNull, versionConflict } from "../../common/persistence";
import { PrismaService } from "../../infrastructure/prisma/prisma.service";
import { AuditService } from "../audit/audit.service";
import type { AuthContext } from "../identity/auth-context";
import { refSelect } from "../work-items/work-item.mapper";

const ENTITY = "Risco";
const CLOSED: RiskStatus[] = ["RESOLVED", "CANCELLED"];
const SEVERITY_RANK: Record<RiskSeverityValue, number> = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3 };

const riskInclude = {
  links: {
    include: {
      workItem: { select: { id: true, externalKey: true, title: true } },
      sprint: { select: { id: true, name: true } },
      release: { select: { id: true, name: true } },
      project: { select: refSelect },
      team: { select: refSelect },
      task: { select: { id: true, title: true } },
    },
  },
} satisfies Prisma.RiskInclude;
type RiskRow = Prisma.RiskGetPayload<{ include: typeof riskInclude }>;

function toRiskDto(row: RiskRow): Risk {
  const pick = <T>(fn: (link: RiskRow["links"][number]) => T | null): T[] => row.links.flatMap((link) => fn(link) ?? []);
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    type: row.type,
    severity: row.severity,
    probability: row.probability,
    impact: row.impact,
    blockingLevel: row.blockingLevel,
    status: row.status,
    mitigationPlan: row.mitigationPlan,
    owner: row.owner,
    identifiedAt: toIsoDate(row.identifiedAt) ?? "",
    resolvedAt: toIsoOrNull(row.resolvedAt),
    resolutionNote: row.resolutionNote,
    links: {
      workItems: pick((l) => l.workItem),
      sprints: pick((l) => l.sprint),
      releases: pick((l) => l.release),
      projects: pick((l) => l.project),
      teams: pick((l) => l.team),
      tasks: pick((l) => l.task),
    },
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    version: row.version,
  };
}

/** Riscos e impedimentos (§16). Resolver não conclui entregas ou atividades associadas (§16.4). */
@Injectable()
export class RisksService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async list(auth: AuthContext, query: z.output<typeof riskListQuerySchema>): Promise<Risk[]> {
    const and: Prisma.RiskWhereInput[] = [];
    // Contexto inclui o que pertence a ele: sprints do time, itens executados pelo time, releases do projeto.
    if (query.teamId) {
      and.push({
        links: {
          some: {
            OR: [
              { teamId: query.teamId },
              { sprint: { teamId: query.teamId } },
              { workItem: { tracking: { executingTeamId: query.teamId } } },
            ],
          },
        },
      });
    }
    if (query.projectId) {
      and.push({
        links: {
          some: {
            OR: [{ projectId: query.projectId }, { release: { projectId: query.projectId } }, { workItem: { projectId: query.projectId } }],
          },
        },
      });
    }
    for (const [key, value] of [
      ["workItemId", query.workItemId],
      ["sprintId", query.sprintId],
      ["releaseId", query.releaseId],
      ["taskId", query.taskId],
    ] as const) {
      if (value) and.push({ links: { some: { [key]: value } } });
    }
    const rows = await this.prisma.risk.findMany({
      where: {
        workspaceId: auth.workspaceId,
        type: query.type,
        ...(query.scope === "open" && { status: { in: [...OPEN_RISK_STATUSES] } }),
        ...(query.scope === "closed" && { status: { in: CLOSED } }),
        AND: and,
      },
      include: riskInclude,
    });
    return rows
      .map(toRiskDto)
      .sort(
        (a, b) =>
          Number(CLOSED.includes(a.status)) - Number(CLOSED.includes(b.status)) ||
          SEVERITY_RANK[a.severity] - SEVERITY_RANK[b.severity] ||
          a.identifiedAt.localeCompare(b.identifiedAt),
      );
  }

  async get(auth: AuthContext, id: string): Promise<RiskDetail> {
    const [row, history] = await Promise.all([
      this.prisma.risk.findFirst({ where: { id, workspaceId: auth.workspaceId }, include: riskInclude }),
      this.audit.history(auth.workspaceId, "risk", id),
    ]);
    if (!row) throw notFound(ENTITY);
    return { ...toRiskDto(row), history };
  }

  async create(auth: AuthContext, input: z.output<typeof createRiskSchema>): Promise<RiskDetail> {
    const { links = {}, identifiedAt, blockingLevel, ...fields } = input;
    await assertLinkTargets(this.prisma, auth.workspaceId, links);
    const today = await workspaceToday(this.prisma, auth.workspaceId);
    const id = await this.prisma.$transaction(async (tx) => {
      const risk = await tx.risk.create({
        data: {
          ...fields,
          // Impedimento sem nível informado bloqueia totalmente (§16.4).
          blockingLevel: fields.type === "IMPEDIMENT" ? (blockingLevel ?? "FULL") : null,
          identifiedAt: fromIsoDate(identifiedAt ?? today) ?? new Date(),
          workspaceId: auth.workspaceId,
        },
      });
      await this.replaceLinks(tx, risk.id, links);
      await this.audit.record(
        {
          action: "risk.created",
          entityType: "risk",
          entityId: risk.id,
          workspaceId: auth.workspaceId,
          actorUserId: auth.userId,
          metadata: { type: risk.type, severity: risk.severity },
        },
        tx,
      );
      return risk.id;
    });
    return this.get(auth, id);
  }

  async update(auth: AuthContext, id: string, input: z.output<typeof updateRiskSchema>): Promise<RiskDetail> {
    const { version, links, identifiedAt, status, blockingLevel, ...fields } = input;
    const current = await this.prisma.risk.findFirst({ where: { id, workspaceId: auth.workspaceId } });
    if (!current) throw notFound(ENTITY);
    if (links) await assertLinkTargets(this.prisma, auth.workspaceId, links);

    const type = fields.type ?? current.type;
    const statusChanged = status !== undefined && status !== current.status;
    const data: Prisma.RiskUpdateManyMutationInput = {
      ...fields,
      identifiedAt: fromIsoDate(identifiedAt) ?? undefined,
      // Só impedimentos têm nível de bloqueio (§16.4).
      blockingLevel: type === "IMPEDIMENT" ? (blockingLevel ?? current.blockingLevel ?? "FULL") : null,
      version: { increment: 1 },
    };
    if (statusChanged) {
      data.status = status;
      // Resolvido continua consultável (RN-008); reabrir limpa a data de resolução.
      data.resolvedAt = status === "RESOLVED" ? new Date() : null;
    }

    await this.prisma.$transaction(async (tx) => {
      const result = await tx.risk.updateMany({ where: { id, workspaceId: auth.workspaceId, version }, data });
      if (result.count === 0) throw versionConflict(ENTITY);
      if (links) await this.replaceLinks(tx, id, links);
      await this.audit.record(
        {
          action: "risk.updated",
          entityType: "risk",
          entityId: id,
          workspaceId: auth.workspaceId,
          actorUserId: auth.userId,
          metadata: {
            fields: changedFields({ ...input }),
            fromVersion: version,
            ...(statusChanged && { fromStatus: current.status, toStatus: status }),
          },
        },
        tx,
      );
    });
    return this.get(auth, id);
  }

  private async replaceLinks(tx: Prisma.TransactionClient, riskId: string, links: LinkInput): Promise<void> {
    for (const { column, ids } of linkChanges(links)) {
      await tx.riskLink.deleteMany({ where: { riskId, [column]: { not: null, notIn: ids } } });
      await tx.riskLink.createMany({
        data: ids.map((target) => ({ riskId, [column]: target }) as Prisma.RiskLinkCreateManyInput),
        skipDuplicates: true,
      });
    }
  }
}
