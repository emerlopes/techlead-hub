import { Injectable } from "@nestjs/common";
import {
  type addSprintItemSchema,
  type closeSprintSchema,
  type startSprintSchema,
  type ContextLoad,
  type createSprintSchema,
  isClosedExecution,
  OPEN_RISK_STATUSES,
  type Sprint,
  type SprintDetail,
  type SprintItem,
  type sprintListQuerySchema,
  type updateSprintSchema,
  type WorkItem,
} from "@tlh/shared-contracts";
import type { z } from "zod";
import type { Prisma, SprintExitReason, SprintStatus } from "../../generated/prisma/client";
import { ApiException } from "../../common/api-exception";
import { assertTeamsActive, workspaceToday } from "../../common/context-rules";
import {
  changedFields,
  fromIsoDate,
  isUniqueViolation,
  notFound,
  ruleViolation,
  toIsoDate,
  toIsoOrNull,
  versionConflict,
} from "../../common/persistence";
import { PrismaService } from "../../infrastructure/prisma/prisma.service";
import { AuditService } from "../audit/audit.service";
import { CapacityService } from "../capacity/capacity.service";
import type { AuthContext } from "../identity/auth-context";
import { refSelect } from "../work-items/work-item.mapper";
import { WorkItemsService } from "../work-items/work-items.service";

const ENTITY = "Sprint";
type Tx = Prisma.TransactionClient;
type MembershipRow = Prisma.SprintMembershipGetPayload<object>;

/** Saídas que fazem parte do escopo final da sprint (encerramento), não do que saiu no meio dela. */
const CLOSING_EXITS: SprintExitReason[] = ["COMPLETED", "NOT_COMPLETED"];
const OPEN_SPRINT: SprintStatus[] = ["PLANNED", "ACTIVE"];
const STATUS_RANK: Record<SprintStatus, number> = { ACTIVE: 0, PLANNED: 1, CLOSED: 2, CANCELLED: 3 };

const sprintInclude = {
  team: { select: refSelect },
  release: { select: { id: true, name: true } },
} satisfies Prisma.SprintInclude;
type SprintRow = Prisma.SprintGetPayload<{ include: typeof sprintInclude }>;

const emptyLoad: ContextLoad = {
  allocatedHours: 0,
  demand: { openItems: 0, estimatedItems: 0, unestimatedItems: 0, dueHours: 0, laterHours: 0, undatedHours: 0, totalHours: 0 },
  utilization: null,
  level: "NO_CAPACITY",
};

const inScope = (m: MembershipRow) => m.exitedAt === null || (m.exitReason !== null && CLOSING_EXITS.includes(m.exitReason));

/** Sprints (§11, §34.8): ciclos, escopo e histórico de movimentações (RN-010). */
@Injectable()
export class SprintsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly workItems: WorkItemsService,
    private readonly capacity: CapacityService,
  ) {}

  async list(auth: AuthContext, query: z.output<typeof sprintListQuerySchema>): Promise<Sprint[]> {
    const rows = await this.prisma.sprint.findMany({
      where: {
        workspaceId: auth.workspaceId,
        status: query.status,
        teamId: query.teamId,
        // Uma sprint pode conter itens de vários projetos (RN-019).
        ...(query.projectId && { memberships: { some: { workItem: { projectId: query.projectId } } } }),
      },
      include: sprintInclude,
      orderBy: { startDate: "desc" },
    });
    const sprints = await this.withCounts(auth, rows);
    return sprints.sort((a, b) => STATUS_RANK[a.status] - STATUS_RANK[b.status]);
  }

  async get(auth: AuthContext, id: string): Promise<SprintDetail> {
    const row = await this.prisma.sprint.findFirst({
      where: { id, workspaceId: auth.workspaceId },
      include: { ...sprintInclude, memberships: { orderBy: { enteredAt: "asc" } } },
    });
    if (!row) throw notFound(ENTITY);
    const [items, history, counted] = await Promise.all([
      this.workItems.loadMany(auth, { id: { in: row.memberships.map((m) => m.workItemId) } }),
      this.audit.history(auth.workspaceId, "sprint", id),
      this.withCounts(auth, [row]),
    ]);
    const sprint = counted[0];
    if (!sprint) throw notFound(ENTITY);
    const byId = new Map(items.map((item) => [item.id, item]));
    const toItem = (m: MembershipRow): SprintItem[] => {
      const workItem = byId.get(m.workItemId);
      return workItem
        ? [
            {
              membershipId: m.id,
              scopeType: m.scopeType,
              enteredAt: m.enteredAt.toISOString(),
              exitedAt: toIsoOrNull(m.exitedAt),
              exitReason: m.exitReason,
              workItem,
            },
          ]
        : [];
    };
    const scope = row.memberships.filter(inScope);
    const closed = row.status === "CLOSED" || row.status === "CANCELLED";
    const completed = scope.filter((m) =>
      closed ? m.exitReason === "COMPLETED" : byId.get(m.workItemId)?.executionStatus === "DONE",
    ).length;

    return {
      ...sprint,
      items: scope.flatMap(toItem),
      departed: row.memberships.filter((m) => !inScope(m)).flatMap(toItem),
      summary: {
        original: row.memberships.filter((m) => m.scopeType === "ORIGINAL").length,
        added: row.memberships.filter((m) => m.scopeType === "ADDED").length,
        movedIn: row.memberships.filter((m) => m.scopeType === "MOVED").length,
        removed: row.memberships.filter((m) => m.exitReason === "REMOVED").length,
        movedOut: row.memberships.filter((m) => m.exitReason === "MOVED").length,
        completed,
        pending: scope.length - completed,
      },
      history,
    };
  }

  async create(auth: AuthContext, input: z.output<typeof createSprintSchema>): Promise<SprintDetail> {
    await assertTeamsActive(this.prisma, auth.workspaceId, [input.teamId], "teamId");
    const id = await this.prisma.$transaction(async (tx) => {
      const sprint = await tx.sprint.create({
        data: {
          ...input,
          workspaceId: auth.workspaceId,
          startDate: new Date(`${input.startDate}T00:00:00Z`),
          endDate: new Date(`${input.endDate}T00:00:00Z`),
        },
      });
      await this.audit.record(
        {
          action: "sprint.created",
          entityType: "sprint",
          entityId: sprint.id,
          workspaceId: auth.workspaceId,
          actorUserId: auth.userId,
          metadata: { teamId: input.teamId },
        },
        tx,
      );
      return sprint.id;
    });
    return this.get(auth, id);
  }

  async update(auth: AuthContext, id: string, input: z.output<typeof updateSprintSchema>): Promise<SprintDetail> {
    const { version, status, startDate, endDate, ...fields } = input;
    const current = await this.find(auth, id);
    const closed = current.status === "CLOSED" || current.status === "CANCELLED";
    if (closed && (status || startDate || endDate)) {
      throw ruleViolation("Sprints encerradas ou canceladas mantêm período e situação; o histórico é preservado.");
    }
    const start = startDate ?? toIsoDate(current.startDate);
    const end = endDate ?? toIsoDate(current.endDate);
    if (start && end && end < start) throw ruleViolation("O fim não pode ser antes do início.", "endDate");

    const statusChanged = status !== undefined && status !== current.status;
    await this.prisma.$transaction(async (tx) => {
      const result = await tx.sprint.updateMany({
        where: { id, workspaceId: auth.workspaceId, version },
        data: {
          ...fields,
          startDate: fromIsoDate(startDate) ?? undefined,
          endDate: fromIsoDate(endDate) ?? undefined,
          ...(statusChanged && { status, ...(status === "CANCELLED" && { closedAt: new Date() }) }),
          version: { increment: 1 },
        },
      });
      if (result.count === 0) throw versionConflict(ENTITY);
      if (status === "CANCELLED" && statusChanged) await this.endScope(tx, id);
      await this.audit.record(
        {
          action: "sprint.updated",
          entityType: "sprint",
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

  /**
   * `POST /sprints/{id}/start`: inicia a sprint planejada confirmando nome e objetivo (§11.2). Sprints
   * geradas pela release nascem com nome provisório e sem objetivo; é aqui que o Tech Lead os define.
   */
  async start(auth: AuthContext, id: string, input: z.output<typeof startSprintSchema>): Promise<SprintDetail> {
    const current = await this.find(auth, id);
    if (current.status !== "PLANNED") throw ruleViolation("Só sprints planejadas podem ser iniciadas.", "status");
    await this.prisma.$transaction(async (tx) => {
      const result = await tx.sprint.updateMany({
        where: { id, workspaceId: auth.workspaceId, version: input.version },
        data: { name: input.name, goal: input.goal, status: "ACTIVE", version: { increment: 1 } },
      });
      if (result.count === 0) throw versionConflict(ENTITY);
      await this.audit.record(
        {
          action: "sprint.started",
          entityType: "sprint",
          entityId: id,
          workspaceId: auth.workspaceId,
          actorUserId: auth.userId,
          metadata: { fields: ["name", "goal"], fromVersion: input.version, fromStatus: "PLANNED", toStatus: "ACTIVE" },
        },
        tx,
      );
    });
    return this.get(auth, id);
  }

  /**
   * `POST /sprints/{id}/close` (§36.8). Registra o resultado de cada item no escopo, mas não conclui
   * histórias (RN-011, CA-009): pendentes podem ser planejadas em outra sprint (§11.6).
   */
  async close(auth: AuthContext, id: string, input: z.output<typeof closeSprintSchema>): Promise<SprintDetail> {
    const current = await this.find(auth, id);
    if (current.status !== "ACTIVE") throw ruleViolation("Só sprints ativas podem ser encerradas.", "status");
    await this.prisma.$transaction(async (tx) => {
      const result = await tx.sprint.updateMany({
        where: { id, workspaceId: auth.workspaceId, version: input.version },
        data: { status: "CLOSED", closedAt: new Date(), version: { increment: 1 } },
      });
      if (result.count === 0) throw versionConflict(ENTITY);
      const outcome = await this.endScope(tx, id);
      await this.audit.record(
        {
          action: "sprint.closed",
          entityType: "sprint",
          entityId: id,
          workspaceId: auth.workspaceId,
          actorUserId: auth.userId,
          metadata: { fromVersion: input.version, fromStatus: "ACTIVE", toStatus: "CLOSED", ...outcome },
        },
        tx,
      );
    });
    return this.get(auth, id);
  }

  /**
   * Planeja um item na sprint. Uma história tem no máximo uma associação corrente (RN-020); com
   * `move`, a corrente é encerrada como remanejada e o histórico é preservado (CA-007, RN-010).
   */
  async addItem(auth: AuthContext, id: string, input: z.output<typeof addSprintItemSchema>): Promise<SprintDetail> {
    const sprint = await this.find(auth, id);
    if (!OPEN_SPRINT.includes(sprint.status)) throw ruleViolation("Sprints encerradas ou canceladas não recebem itens.");
    await this.workItems.assertPlannable(auth, input.workItemId);
    const [current, lastEnded] = await Promise.all([
      this.prisma.sprintMembership.findFirst({
        where: { workItemId: input.workItemId, exitedAt: null },
        include: { sprint: { select: { name: true } } },
      }),
      this.prisma.sprintMembership.findFirst({
        where: { workItemId: input.workItemId, exitedAt: { not: null } },
        orderBy: { exitedAt: "desc" },
      }),
    ]);
    if (current?.sprintId === id) throw new ApiException(409, "CONFLICT", "O item já está nesta sprint.");
    if (current && !input.move) {
      throw new ApiException(
        409,
        "CONFLICT",
        `O item está na sprint ${current.sprint.name}. Remaneje para mover preservando o histórico (RN-020).`,
      );
    }
    // Remanejado: veio de outra sprint, agora ou ao fim da anterior sem ser concluído (§11.5).
    const scopeType =
      current || lastEnded?.exitReason === "NOT_COMPLETED" || lastEnded?.exitReason === "MOVED"
        ? "MOVED"
        : sprint.status === "PLANNED"
          ? "ORIGINAL"
          : "ADDED";

    await this.prisma
      .$transaction(async (tx) => {
        if (current) {
          await tx.sprintMembership.update({ where: { id: current.id }, data: { exitedAt: new Date(), exitReason: "MOVED" } });
        }
        await tx.sprintMembership.create({ data: { sprintId: id, workItemId: input.workItemId, scopeType } });
        await this.audit.record(
          {
            action: current ? "sprint.item_moved" : "sprint.item_added",
            entityType: "sprint",
            entityId: id,
            workspaceId: auth.workspaceId,
            actorUserId: auth.userId,
            metadata: { workItemId: input.workItemId, scopeType, ...(current && { fromSprintId: current.sprintId }) },
          },
          tx,
        );
      })
      .catch((error: unknown) => {
        throw isUniqueViolation(error) ? new ApiException(409, "CONFLICT", "O item entrou em outra sprint ao mesmo tempo.") : error;
      });
    return this.get(auth, id);
  }

  /** Retira o item do escopo; a participação continua no histórico como removida (RN-010). */
  async removeItem(auth: AuthContext, id: string, workItemId: string): Promise<SprintDetail> {
    const sprint = await this.find(auth, id);
    if (!OPEN_SPRINT.includes(sprint.status)) throw ruleViolation("O escopo de sprints encerradas é preservado.");
    await this.prisma.$transaction(async (tx) => {
      const result = await tx.sprintMembership.updateMany({
        where: { sprintId: id, workItemId, exitedAt: null },
        data: { exitedAt: new Date(), exitReason: "REMOVED" },
      });
      if (result.count === 0) throw notFound("Item na sprint");
      await this.audit.record(
        {
          action: "sprint.item_removed",
          entityType: "sprint",
          entityId: id,
          workspaceId: auth.workspaceId,
          actorUserId: auth.userId,
          metadata: { workItemId },
        },
        tx,
      );
    });
    return this.get(auth, id);
  }

  /** Contagens para listas e dashboard (§5.2.4). Riscos contados uma vez (sprint + itens). */
  async withCounts(auth: AuthContext, rows: SprintRow[], today?: string): Promise<Sprint[]> {
    if (rows.length === 0) return [];
    const ids = rows.map((r) => r.id);
    const [memberships, sprintRisks, day] = await Promise.all([
      this.prisma.sprintMembership.findMany({ where: { sprintId: { in: ids } } }),
      this.prisma.riskLink.findMany({
        where: { sprintId: { in: ids }, risk: { status: { in: [...OPEN_RISK_STATUSES] } } },
        select: { sprintId: true, riskId: true },
      }),
      today ?? workspaceToday(this.prisma, auth.workspaceId),
    ]);
    const scope = memberships.filter(inScope);
    const items = await this.workItems.loadMany(auth, { id: { in: [...new Set(scope.map((m) => m.workItemId))] } }, day);
    const byId = new Map<string, WorkItem>(items.map((item) => [item.id, item]));
    // Demanda estimada = esforço restante dos itens em aberto do escopo (RN-035).
    const loads = await this.capacity.sprintLoads(
      auth,
      rows.map((row) => ({
        id: row.id,
        teamId: row.teamId,
        startDate: toIsoDate(row.startDate) ?? "",
        endDate: toIsoDate(row.endDate) ?? "",
        remaining: scope
          .filter((m) => m.sprintId === row.id)
          .flatMap((m) => byId.get(m.workItemId) ?? [])
          .filter((item) => !isClosedExecution(item.executionStatus))
          .map((item) => item.tracking.remainingEffortHours),
      })),
    );

    return rows.map((row) => {
      const own = scope.filter((m) => m.sprintId === row.id);
      const closed = row.status === "CLOSED" || row.status === "CANCELLED";
      const sprintItems = own.flatMap((m) => byId.get(m.workItemId) ?? []);
      const risks = new Set([
        ...sprintRisks.filter((r) => r.sprintId === row.id).map((r) => r.riskId),
        ...sprintItems.flatMap((item) => item.openRisks.map((r) => r.id)),
      ]);
      return {
        id: row.id,
        team: row.team,
        name: row.name,
        goal: row.goal,
        startDate: toIsoDate(row.startDate) ?? "",
        endDate: toIsoDate(row.endDate) ?? "",
        status: row.status,
        release: row.release,
        closedAt: toIsoOrNull(row.closedAt),
        counts: {
          total: own.length,
          done: closed
            ? own.filter((m) => m.exitReason === "COMPLETED").length
            : sprintItems.filter((item) => item.executionStatus === "DONE").length,
          blocked: sprintItems.filter((item) => item.tracking.health === "BLOCKED").length,
          openRisks: risks.size,
        },
        capacity: loads.get(row.id) ?? emptyLoad,
        createdAt: row.createdAt.toISOString(),
        updatedAt: row.updatedAt.toISOString(),
        version: row.version,
      };
    });
  }

  /** Encerra o escopo corrente registrando concluídos e pendentes, sem tocar nos itens (RN-011). */
  private async endScope(tx: Tx, sprintId: string): Promise<{ completed: number; notCompleted: number }> {
    const now = new Date();
    const done = await tx.sprintMembership.updateMany({
      where: { sprintId, exitedAt: null, workItem: { executionStatus: "DONE" } },
      data: { exitedAt: now, exitReason: "COMPLETED" },
    });
    const pending = await tx.sprintMembership.updateMany({
      where: { sprintId, exitedAt: null },
      data: { exitedAt: now, exitReason: "NOT_COMPLETED" },
    });
    return { completed: done.count, notCompleted: pending.count };
  }

  private async find(auth: AuthContext, id: string) {
    const sprint = await this.prisma.sprint.findFirst({ where: { id, workspaceId: auth.workspaceId } });
    if (!sprint) throw notFound(ENTITY);
    return sprint;
  }

  async remove(auth: AuthContext, id: string): Promise<void> {
    await this.audit.deleteEntity(
      { entityType: "sprint", entityId: id, workspaceId: auth.workspaceId, actorUserId: auth.userId, label: ENTITY },
      (tx) => tx.sprint.deleteMany({ where: { id, workspaceId: auth.workspaceId } }),
    );
  }
}
