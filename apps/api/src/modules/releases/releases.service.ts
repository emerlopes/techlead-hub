import { Injectable } from "@nestjs/common";
import {
  type addReleaseItemSchema,
  classifyHealth,
  isClosedExecution,
  type createMilestoneSchema,
  type CreateReleaseResult,
  type createReleaseSchema,
  planSprintCalendar,
  type SprintGeneration,
  OPEN_RISK_STATUSES,
  type Release,
  type ReleaseDetail,
  type releaseListQuerySchema,
  riskSignals,
  type updateMilestoneSchema,
  type updateReleaseItemSchema,
  type updateReleaseSchema,
  type WorkItem,
} from "@tlh/shared-contracts";
import type { z } from "zod";
import type { Prisma, ReleaseStatus } from "../../generated/prisma/client";
import { ApiException } from "../../common/api-exception";
import { assertProjectsOpen, workspaceToday } from "../../common/context-rules";
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
import type { AuthContext } from "../identity/auth-context";
import { refSelect } from "../work-items/work-item.mapper";
import { WorkItemsService } from "../work-items/work-items.service";

const ENTITY = "Release";
const CLOSED: ReleaseStatus[] = ["RELEASED", "CANCELLED"];
const STATUS_RANK: Record<ReleaseStatus, number> = { IN_PROGRESS: 0, PLANNED: 1, RELEASED: 2, CANCELLED: 3 };

const releaseInclude = { project: { select: refSelect } } satisfies Prisma.ReleaseInclude;
type ReleaseRow = Prisma.ReleaseGetPayload<{ include: typeof releaseInclude }>;

/** Releases (§12, §34.9): compromissos, escopo e marcos. */
@Injectable()
export class ReleasesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly workItems: WorkItemsService,
  ) {}

  async list(auth: AuthContext, query: z.output<typeof releaseListQuerySchema>): Promise<Release[]> {
    const rows = await this.prisma.release.findMany({
      where: {
        workspaceId: auth.workspaceId,
        status: query.status,
        projectId: query.projectId,
        // Times participantes vêm dos itens vigentes (§12.2); a release aparece uma vez (§12.5).
        ...(query.teamId && {
          memberships: { some: { removedAt: null, workItem: { tracking: { executingTeamId: query.teamId } } } },
        }),
      },
      include: releaseInclude,
      orderBy: [{ committedDate: { sort: "asc", nulls: "last" } }, { createdAt: "desc" }],
    });
    const releases = await this.withSummary(auth, rows);
    return releases.sort((a, b) => STATUS_RANK[a.status] - STATUS_RANK[b.status]);
  }

  async get(auth: AuthContext, id: string): Promise<ReleaseDetail> {
    const row = await this.prisma.release.findFirst({
      where: { id, workspaceId: auth.workspaceId },
      include: {
        ...releaseInclude,
        memberships: {
          orderBy: { addedAt: "asc" },
          include: { workItem: { select: { id: true, externalKey: true, title: true } } },
        },
        milestones: { orderBy: [{ targetDate: { sort: "asc", nulls: "last" } }, { createdAt: "asc" }] },
        forecastHistory: { orderBy: { changedAt: "desc" }, take: 100 },
        sprints: { include: { team: { select: refSelect } }, orderBy: [{ startDate: "asc" }, { team: { code: "asc" } }] },
      },
    });
    if (!row) throw notFound(ENTITY);
    const current = row.memberships.filter((m) => m.removedAt === null);
    const [items, history, summarized] = await Promise.all([
      this.workItems.loadMany(auth, { id: { in: current.map((m) => m.workItemId) } }),
      this.audit.history(auth.workspaceId, "release", id),
      this.withSummary(auth, [row]),
    ]);
    const release = summarized[0];
    if (!release) throw notFound(ENTITY);
    const byId = new Map(items.map((item) => [item.id, item]));

    return {
      ...release,
      items: current.flatMap((m) => {
        const workItem = byId.get(m.workItemId);
        return workItem ? [{ membershipId: m.id, isRequired: m.isRequired, addedAt: m.addedAt.toISOString(), workItem }] : [];
      }),
      removed: row.memberships.flatMap((m) =>
        m.removedAt
          ? [
              {
                membershipId: m.id,
                isRequired: m.isRequired,
                addedAt: m.addedAt.toISOString(),
                removedAt: m.removedAt.toISOString(),
                workItem: m.workItem,
              },
            ]
          : [],
      ),
      milestones: row.milestones.map((m) => ({
        id: m.id,
        name: m.name,
        targetDate: toIsoDate(m.targetDate),
        completedAt: toIsoOrNull(m.completedAt),
      })),
      generatedSprints: row.sprints.map((sprint) => ({
        id: sprint.id,
        name: sprint.name,
        team: sprint.team,
        startDate: toIsoDate(sprint.startDate) ?? "",
        endDate: toIsoDate(sprint.endDate) ?? "",
        status: sprint.status,
      })),
      forecastHistory: row.forecastHistory.map((h) => ({
        id: h.id,
        changedAt: h.changedAt.toISOString(),
        committedDate: toIsoDate(h.committedDate),
        forecastDate: toIsoDate(h.forecastDate),
      })),
      history,
    };
  }

  /**
   * Cadastro da release. Com `sprintLengthDays`, gera em cada time participante do projeto (§9.1)
   * sprints planejadas de N dias úteis, do início até cobrir o prazo comprometido. Períodos já
   * ocupados por sprints abertas do time são pulados. Nome provisório; nome e objetivo são definidos
   * ao iniciar (§11.2). Tudo na mesma transação.
   */
  async create(auth: AuthContext, input: z.output<typeof createReleaseSchema>): Promise<CreateReleaseResult> {
    const { startDate, sprintLengthDays, ...fields } = input;
    await assertProjectsOpen(this.prisma, auth.workspaceId, [input.projectId], "projectId");
    const calendarStart = startDate ?? (sprintLengthDays ? await workspaceToday(this.prisma, auth.workspaceId) : null);
    const teams = sprintLengthDays
      ? await this.prisma.teamProject.findMany({
          where: { projectId: input.projectId, endedAt: null, team: { status: "ACTIVE", workspaceId: auth.workspaceId } },
          select: { teamId: true },
        })
      : [];
    if (sprintLengthDays && teams.length === 0) {
      throw ruleViolation(
        "O projeto não tem times participantes ativos para receber as sprints. Associe um time ao projeto ou deixe a duração em branco.",
        "sprintLengthDays",
      );
    }

    const { id, generation } = await this.prisma.$transaction(async (tx) => {
      const release = await tx.release.create({
        data: {
          ...fields,
          workspaceId: auth.workspaceId,
          startDate: fromIsoDate(calendarStart) ?? null,
          sprintLength: sprintLengthDays ?? null,
          committedDate: fromIsoDate(input.committedDate) ?? null,
          forecastDate: fromIsoDate(input.forecastDate) ?? null,
        },
      });
      if (release.committedDate || release.forecastDate) {
        await tx.releaseForecastHistory.create({
          data: { releaseId: release.id, actorUserId: auth.userId, committedDate: release.committedDate, forecastDate: release.forecastDate },
        });
      }
      const generation =
        sprintLengthDays && calendarStart && input.committedDate
          ? await this.generateSprints(tx, auth, release, {
              teamIds: teams.map((t) => t.teamId),
              startDate: calendarStart,
              untilDate: input.committedDate,
              lengthDays: sprintLengthDays,
            })
          : null;
      await this.audit.record(
        {
          action: "release.created",
          entityType: "release",
          entityId: release.id,
          workspaceId: auth.workspaceId,
          actorUserId: auth.userId,
          metadata: { projectId: input.projectId, ...(generation && { sprintLengthDays, generatedSprints: generation.created }) },
        },
        tx,
      );
      return { id: release.id, generation };
    });
    return { ...(await this.get(auth, id)), sprintGeneration: generation };
  }

  private async generateSprints(
    tx: Prisma.TransactionClient,
    auth: AuthContext,
    release: { id: string; name: string },
    plan: { teamIds: string[]; startDate: string; untilDate: string; lengthDays: number },
  ): Promise<SprintGeneration> {
    const occupied = await tx.sprint.findMany({
      where: { teamId: { in: plan.teamIds }, status: { in: ["PLANNED", "ACTIVE"] } },
      select: { teamId: true, startDate: true, endDate: true },
    });
    let created = 0;
    let skipped = 0;
    for (const teamId of plan.teamIds) {
      const calendar = planSprintCalendar({
        startDate: plan.startDate,
        untilDate: plan.untilDate,
        lengthDays: plan.lengthDays,
        occupied: occupied
          .filter((o) => o.teamId === teamId)
          .map((o) => ({ startDate: toIsoDate(o.startDate) ?? "", endDate: toIsoDate(o.endDate) ?? "" })),
      });
      skipped += calendar.skipped.length;
      for (const [index, period] of calendar.planned.entries()) {
        const sprint = await tx.sprint.create({
          data: {
            workspaceId: auth.workspaceId,
            teamId,
            releaseId: release.id,
            name: `Sprint ${index + 1} · ${release.name}`.slice(0, 80),
            startDate: new Date(`${period.startDate}T00:00:00Z`),
            endDate: new Date(`${period.endDate}T00:00:00Z`),
          },
        });
        await this.audit.record(
          {
            action: "sprint.created",
            entityType: "sprint",
            entityId: sprint.id,
            workspaceId: auth.workspaceId,
            actorUserId: auth.userId,
            metadata: { teamId, releaseId: release.id, generated: true },
          },
          tx,
        );
        created++;
      }
    }
    return { created, skipped, teams: plan.teamIds.length };
  }

  async update(auth: AuthContext, id: string, input: z.output<typeof updateReleaseSchema>): Promise<ReleaseDetail> {
    const { version, status, committedDate, forecastDate, ...fields } = input;
    const current = await this.find(auth, id);
    const statusChanged = status !== undefined && status !== current.status;
    if (statusChanged && CLOSED.includes(current.status)) {
      throw ruleViolation("Releases encerradas não mudam de situação; o histórico é preservado.", "status");
    }
    const datesChanged =
      (committedDate !== undefined && committedDate !== toIsoDate(current.committedDate)) ||
      (forecastDate !== undefined && forecastDate !== toIsoDate(current.forecastDate));

    await this.prisma.$transaction(async (tx) => {
      const result = await tx.release.updateMany({
        where: { id, workspaceId: auth.workspaceId, version },
        data: {
          ...fields,
          committedDate: fromIsoDate(committedDate),
          forecastDate: fromIsoDate(forecastDate),
          ...(statusChanged && { status, closedAt: status && CLOSED.includes(status) ? new Date() : null }),
          version: { increment: 1 },
        },
      });
      if (result.count === 0) throw versionConflict(ENTITY);
      // Alterações de previsão preservam histórico (§12.5).
      if (datesChanged) {
        const updated = await tx.release.findUniqueOrThrow({ where: { id }, select: { committedDate: true, forecastDate: true } });
        await tx.releaseForecastHistory.create({ data: { releaseId: id, actorUserId: auth.userId, ...updated } });
      }
      await this.audit.record(
        {
          action: "release.updated",
          entityType: "release",
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

  /** Uma história pode contribuir para várias releases (RN-009) e vir de vários times (CA-008). */
  async addItem(auth: AuthContext, id: string, input: z.output<typeof addReleaseItemSchema>): Promise<ReleaseDetail> {
    await this.findOpen(auth, id);
    const item = await this.prisma.externalWorkItem.findFirst({
      where: { id: input.workItemId, workspaceId: auth.workspaceId },
      select: { executionStatus: true },
    });
    if (!item) throw notFound("Item");
    if (item.executionStatus === "CANCELLED") throw ruleViolation("Itens cancelados não entram em releases.", "workItemId");
    await this.prisma
      .$transaction(async (tx) => {
        await tx.releaseMembership.create({ data: { releaseId: id, ...input } });
        await this.recordItemChange(tx, auth, id, "release.item_added", { workItemId: input.workItemId, isRequired: input.isRequired });
      })
      .catch((error: unknown) => {
        throw isUniqueViolation(error) ? new ApiException(409, "CONFLICT", "O item já está nesta release.") : error;
      });
    return this.get(auth, id);
  }

  async updateItem(
    auth: AuthContext,
    id: string,
    workItemId: string,
    input: z.output<typeof updateReleaseItemSchema>,
  ): Promise<ReleaseDetail> {
    await this.findOpen(auth, id);
    await this.prisma.$transaction(async (tx) => {
      const result = await tx.releaseMembership.updateMany({
        where: { releaseId: id, workItemId, removedAt: null },
        data: { isRequired: input.isRequired },
      });
      if (result.count === 0) throw notFound("Item na release");
      await this.recordItemChange(tx, auth, id, "release.item_updated", { workItemId, isRequired: input.isRequired });
    });
    return this.get(auth, id);
  }

  async removeItem(auth: AuthContext, id: string, workItemId: string): Promise<ReleaseDetail> {
    await this.findOpen(auth, id);
    await this.prisma.$transaction(async (tx) => {
      const result = await tx.releaseMembership.updateMany({
        where: { releaseId: id, workItemId, removedAt: null },
        data: { removedAt: new Date() },
      });
      if (result.count === 0) throw notFound("Item na release");
      await this.recordItemChange(tx, auth, id, "release.item_removed", { workItemId });
    });
    return this.get(auth, id);
  }

  async addMilestone(auth: AuthContext, id: string, input: z.output<typeof createMilestoneSchema>): Promise<ReleaseDetail> {
    await this.find(auth, id);
    await this.prisma.$transaction(async (tx) => {
      const milestone = await tx.releaseMilestone.create({
        data: { releaseId: id, name: input.name, targetDate: fromIsoDate(input.targetDate) ?? null },
      });
      await this.audit.record(
        {
          action: "release_milestone.created",
          entityType: "release_milestone",
          entityId: milestone.id,
          workspaceId: auth.workspaceId,
          actorUserId: auth.userId,
          metadata: { releaseId: id },
        },
        tx,
      );
    });
    return this.get(auth, id);
  }

  async updateMilestone(auth: AuthContext, milestoneId: string, input: z.output<typeof updateMilestoneSchema>): Promise<ReleaseDetail> {
    const milestone = await this.findMilestone(auth, milestoneId);
    const { completed, targetDate, ...fields } = input;
    await this.prisma.$transaction(async (tx) => {
      await tx.releaseMilestone.update({
        where: { id: milestoneId },
        data: {
          ...fields,
          targetDate: fromIsoDate(targetDate),
          ...(completed !== undefined && { completedAt: completed ? (milestone.completedAt ?? new Date()) : null }),
        },
      });
      await this.audit.record(
        {
          action: "release_milestone.updated",
          entityType: "release_milestone",
          entityId: milestoneId,
          workspaceId: auth.workspaceId,
          actorUserId: auth.userId,
          metadata: { releaseId: milestone.releaseId, fields: changedFields({ ...input }) },
        },
        tx,
      );
    });
    return this.get(auth, milestone.releaseId);
  }

  async removeMilestone(auth: AuthContext, milestoneId: string): Promise<ReleaseDetail> {
    const milestone = await this.findMilestone(auth, milestoneId);
    await this.prisma.$transaction(async (tx) => {
      await tx.releaseMilestone.delete({ where: { id: milestoneId } });
      await this.audit.record(
        {
          action: "release_milestone.deleted",
          entityType: "release_milestone",
          entityId: milestoneId,
          workspaceId: auth.workspaceId,
          actorUserId: auth.userId,
          metadata: { releaseId: milestone.releaseId },
        },
        tx,
      );
    });
    return this.get(auth, milestone.releaseId);
  }

  /**
   * Saúde, progresso, times e riscos (§12.2, §5.2.5). Bloqueio de item obrigatório bloqueia a release;
   * item obrigatório atrasado ou em risco a coloca em risco. Progresso por contagem e, em horas, só o
   * esforço restante estimado; itens sem estimativa contam à parte (§3.4).
   */
  async withSummary(auth: AuthContext, rows: ReleaseRow[], today?: string): Promise<Release[]> {
    if (rows.length === 0) return [];
    const ids = rows.map((r) => r.id);
    const [memberships, releaseRisks, day] = await Promise.all([
      this.prisma.releaseMembership.findMany({ where: { releaseId: { in: ids }, removedAt: null } }),
      this.prisma.riskLink.findMany({
        where: { releaseId: { in: ids }, risk: { status: { in: [...OPEN_RISK_STATUSES] } } },
        select: { releaseId: true, risk: { select: { id: true, type: true, severity: true, blockingLevel: true } } },
      }),
      today ?? workspaceToday(this.prisma, auth.workspaceId),
    ]);
    const items = await this.workItems.loadMany(auth, { id: { in: [...new Set(memberships.map((m) => m.workItemId))] } }, day);
    const byId = new Map<string, WorkItem>(items.map((item) => [item.id, item]));

    return rows.map((row) => {
      const own = memberships.filter((m) => m.releaseId === row.id);
      const required = own.filter((m) => m.isRequired).flatMap((m) => byId.get(m.workItemId) ?? []);
      const optional = own.filter((m) => !m.isRequired).flatMap((m) => byId.get(m.workItemId) ?? []);
      const direct = releaseRisks.filter((r) => r.releaseId === row.id).map((r) => r.risk);
      const signals = riskSignals(direct);
      const committedDate = toIsoDate(row.committedDate);
      const forecastDate = toIsoDate(row.forecastDate);
      const teams = new Map(
        [...required, ...optional].flatMap((item) => (item.tracking.executingTeam ? [[item.tracking.executingTeam.id, item.tracking.executingTeam]] : [])),
      );
      const risks = new Set([...direct.map((r) => r.id), ...[...required, ...optional].flatMap((i) => i.openRisks.map((r) => r.id))]);
      const done = (list: WorkItem[]) => list.filter((item) => item.executionStatus === "DONE").length;
      const openRequired = required.filter((item) => !isClosedExecution(item.executionStatus));
      const remaining = openRequired.flatMap((item) => item.tracking.remainingEffortHours ?? []);

      return {
        id: row.id,
        project: row.project,
        name: row.name,
        description: row.description,
        startDate: toIsoDate(row.startDate),
        sprintLengthDays: row.sprintLength,
        committedDate,
        forecastDate,
        status: row.status,
        closedAt: toIsoOrNull(row.closedAt),
        health: classifyHealth(
          {
            closed: CLOSED.includes(row.status),
            committedDate,
            forecastDate,
            blocked: signals.blocked || required.some((i) => i.tracking.health === "BLOCKED"),
            atRisk: signals.atRisk || required.some((i) => i.tracking.health === "DELAYED" || i.tracking.health === "AT_RISK"),
          },
          day,
        ),
        progress: {
          required: required.length,
          requiredDone: done(required),
          optional: optional.length,
          optionalDone: done(optional),
          requiredRemainingHours: Math.round(remaining.reduce((t, h) => t + h, 0) * 100) / 100,
          requiredUnestimated: openRequired.length - remaining.length,
        },
        teams: [...teams.values()].sort((a, b) => a.code.localeCompare(b.code)),
        openRiskCount: risks.size,
        createdAt: row.createdAt.toISOString(),
        updatedAt: row.updatedAt.toISOString(),
        version: row.version,
      };
    });
  }

  private recordItemChange(
    tx: Prisma.TransactionClient,
    auth: AuthContext,
    releaseId: string,
    action: "release.item_added" | "release.item_updated" | "release.item_removed",
    metadata: Prisma.InputJsonObject,
  ): Promise<void> {
    return this.audit.record(
      { action, entityType: "release", entityId: releaseId, workspaceId: auth.workspaceId, actorUserId: auth.userId, metadata },
      tx,
    );
  }

  private async find(auth: AuthContext, id: string) {
    const release = await this.prisma.release.findFirst({ where: { id, workspaceId: auth.workspaceId } });
    if (!release) throw notFound(ENTITY);
    return release;
  }

  /** O escopo de releases encerradas é preservado. */
  private async findOpen(auth: AuthContext, id: string) {
    const release = await this.find(auth, id);
    if (CLOSED.includes(release.status)) throw ruleViolation("O escopo de releases encerradas é preservado.");
    return release;
  }

  private async findMilestone(auth: AuthContext, id: string) {
    const milestone = await this.prisma.releaseMilestone.findFirst({ where: { id, release: { workspaceId: auth.workspaceId } } });
    if (!milestone) throw notFound("Marco");
    return milestone;
  }

  async remove(auth: AuthContext, id: string): Promise<void> {
    await this.audit.deleteEntity(
      { entityType: "release", entityId: id, workspaceId: auth.workspaceId, actorUserId: auth.userId, label: ENTITY },
      (tx) => tx.release.deleteMany({ where: { id, workspaceId: auth.workspaceId } }),
    );
  }
}
