import { Injectable } from "@nestjs/common";
import {
  type createWorkItemSchema,
  DEFAULT_READINESS_CHECKLIST,
  isClosedExecution,
  type Paginated,
  paginate,
  type updateWorkItemSchema,
  type WorkItem,
  type WorkItemDetail,
  type workItemListQuerySchema,
} from "@tlh/shared-contracts";
import type { z } from "zod";
import type { Prisma } from "../../generated/prisma/client";
import { ApiException } from "../../common/api-exception";
import {
  assertDeveloperActive,
  assertProjectsOpen,
  assertTeamsActive,
  workspaceToday,
} from "../../common/context-rules";
import {
  changedFields,
  fromIsoDate,
  isUniqueViolation,
  notFound,
  ruleViolation,
  toIsoDate,
  toIsoOrNull,
  toNumberOrNull,
  versionConflict,
} from "../../common/persistence";
import { PrismaService } from "../../infrastructure/prisma/prisma.service";
import { AuditService } from "../audit/audit.service";
import type { AuthContext } from "../identity/auth-context";
import { refinementInclude, toRefinementDto } from "./refinement.mapper";
import { compareWorkItems, refSelect, toWorkItemDto, workItemInclude } from "./work-item.mapper";

const ENTITY = "Item";
type Tx = Prisma.TransactionClient;
type CreateInput = z.output<typeof createWorkItemSchema>;
type UpdateInput = z.output<typeof updateWorkItemSchema>;
type ListQuery = z.output<typeof workItemListQuerySchema>;

function duplicateKey(key: string): ApiException {
  return new ApiException(409, "CONFLICT", `O item ${key} já está cadastrado nesta origem (RN-005).`, {
    details: [{ path: "externalKey", message: "Identificador já cadastrado nesta origem (RN-005)." }],
  });
}

/**
 * Grava a fotografia do acompanhamento depois de uma mudança relevante (RN-006, CA-006). Lê o estado
 * já alterado dentro da mesma transação.
 */
export async function recordTrackingSnapshot(
  tx: Tx,
  workItemId: string,
  actorUserId: string,
  fields: string[],
): Promise<void> {
  const item = await tx.externalWorkItem.findUniqueOrThrow({
    where: { id: workItemId },
    select: { executionStatus: true, refinementStatus: true, tracking: true },
  });
  const t = item.tracking;
  if (!t) return;
  await tx.deliveryTrackingHistory.create({
    data: {
      deliveryTrackingId: t.id,
      actorUserId,
      changedFields: fields,
      executionStatus: item.executionStatus,
      refinementStatus: item.refinementStatus,
      executingTeamId: t.executingTeamId,
      developerId: t.developerId,
      committedDate: t.committedDate,
      manualForecastDate: t.manualForecastDate,
      healthStatus: t.healthStatus,
      remainingEffortHours: t.remainingEffortHours,
      statusNote: t.statusNote,
    },
  });
}

/** Itens externos (§13, §34.7) e acompanhamento corrente (§14, §34.11). */
@Injectable()
export class WorkItemsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  /** Carrega e mapeia itens para reutilização em sprints, releases, refinamento e dashboard. */
  async loadMany(auth: AuthContext, where: Prisma.ExternalWorkItemWhereInput, today?: string): Promise<WorkItem[]> {
    const [rows, day] = await Promise.all([
      this.prisma.externalWorkItem.findMany({ where: { ...where, workspaceId: auth.workspaceId }, include: workItemInclude }),
      today ?? workspaceToday(this.prisma, auth.workspaceId),
    ]);
    const now = new Date();
    return rows.map((row) => toWorkItemDto(row, day, now)).sort(compareWorkItems);
  }

  /** Filtro de contexto: time executor e projeto de referência (§14.2). */
  contextWhere(context: { teamId?: string; projectId?: string; developerId?: string }): Prisma.ExternalWorkItemWhereInput {
    return {
      ...(context.projectId && { projectId: context.projectId }),
      ...((context.teamId || context.developerId) && {
        tracking: {
          ...(context.teamId && { executingTeamId: context.teamId }),
          ...(context.developerId && { developerId: context.developerId }),
        },
      }),
    };
  }

  /**
   * Saúde calculada e desatualização dependem de "hoje", então esses filtros e a ordenação são
   * aplicados depois do mapeamento; a paginação vem por último (RNF-009).
   */
  async list(auth: AuthContext, query: ListQuery): Promise<Paginated<WorkItem>> {
    const closed = ["DONE", "CANCELLED"] as const;
    const where: Prisma.ExternalWorkItemWhereInput = {
      ...this.contextWhere(query),
      ...(query.scope === "open" && { executionStatus: { notIn: [...closed] } }),
      ...(query.scope === "closed" && { executionStatus: { in: [...closed] } }),
      ...(query.sprintId && { sprintMemberships: { some: { sprintId: query.sprintId, exitedAt: null } } }),
      ...(query.releaseId && { releaseMemberships: { some: { releaseId: query.releaseId, removedAt: null } } }),
      ...(query.q && {
        OR: [
          { externalKey: { contains: query.q, mode: "insensitive" } },
          { title: { contains: query.q, mode: "insensitive" } },
        ],
      }),
    };
    const items = (await this.loadMany(auth, where)).filter(
      (item) =>
        (!query.health || item.tracking.health === query.health) && (query.stale === undefined || item.tracking.stale === query.stale),
    );
    return paginate(items, query.page, query.pageSize);
  }

  async get(auth: AuthContext, id: string): Promise<WorkItemDetail> {
    const [row, sprintHistory, releaseHistory, tasks, today] = await Promise.all([
      this.prisma.externalWorkItem.findFirst({
        where: { id, workspaceId: auth.workspaceId },
        include: {
          ...workItemInclude,
          ...refinementInclude,
          tracking: {
            include: {
              ...workItemInclude.tracking.include,
              history: { orderBy: { changedAt: "desc" }, take: 100 },
            },
          },
        },
      }),
      this.prisma.sprintMembership.findMany({
        where: { workItemId: id, workItem: { workspaceId: auth.workspaceId } },
        include: { sprint: { select: { id: true, name: true, status: true } } },
        orderBy: { enteredAt: "desc" },
      }),
      this.prisma.releaseMembership.findMany({
        where: { workItemId: id, workItem: { workspaceId: auth.workspaceId } },
        include: { release: { select: { id: true, name: true } } },
        orderBy: { addedAt: "desc" },
      }),
      this.prisma.taskWorkItem.findMany({
        where: { workItemId: id, task: { workspaceId: auth.workspaceId } },
        select: { task: { select: { id: true, title: true, status: true } } },
      }),
      workspaceToday(this.prisma, auth.workspaceId),
    ]);
    if (!row) throw notFound(ENTITY);

    const history = row.tracking?.history ?? [];
    const [teams, developers] = await Promise.all([
      this.prisma.team.findMany({
        where: { id: { in: history.flatMap((h) => (h.executingTeamId ? [h.executingTeamId] : [])) } },
        select: refSelect,
      }),
      this.prisma.developer.findMany({
        where: { id: { in: history.flatMap((h) => (h.developerId ? [h.developerId] : [])) } },
        select: { id: true, name: true },
      }),
    ]);
    const dto = toWorkItemDto(row, today, new Date());

    return {
      ...dto,
      refinement: toRefinementDto(row, dto, today),
      trackingHistory: history.map((h) => ({
        id: h.id,
        changedAt: h.changedAt.toISOString(),
        changedFields: h.changedFields,
        executionStatus: h.executionStatus,
        refinementStatus: h.refinementStatus,
        executingTeam: teams.find((t) => t.id === h.executingTeamId) ?? null,
        developer: developers.find((d) => d.id === h.developerId) ?? null,
        committedDate: toIsoDate(h.committedDate),
        manualForecastDate: toIsoDate(h.manualForecastDate),
        healthStatus: h.healthStatus,
        remainingEffortHours: toNumberOrNull(h.remainingEffortHours),
        statusNote: h.statusNote,
      })),
      sprintHistory: sprintHistory.map((m) => ({
        id: m.id,
        sprint: m.sprint,
        scopeType: m.scopeType,
        enteredAt: m.enteredAt.toISOString(),
        exitedAt: toIsoOrNull(m.exitedAt),
        exitReason: m.exitReason,
      })),
      releaseHistory: releaseHistory.map((m) => ({
        id: m.id,
        release: m.release,
        isRequired: m.isRequired,
        addedAt: m.addedAt.toISOString(),
        removedAt: toIsoOrNull(m.removedAt),
      })),
      tasks: tasks.map((link) => link.task),
    };
  }

  async create(auth: AuthContext, input: CreateInput): Promise<WorkItemDetail> {
    const { executingTeamId, developerId, committedDate, manualForecastDate, manualHealth, remainingEffortHours, statusSource, statusNote, ...item } =
      input;
    await this.assertSource(auth, item.sourceId);
    await assertProjectsOpen(this.prisma, auth.workspaceId, [item.projectId], "projectId");
    if (executingTeamId) await assertTeamsActive(this.prisma, auth.workspaceId, [executingTeamId], "executingTeamId");
    if (developerId) await assertDeveloperActive(this.prisma, auth.workspaceId, developerId, "developerId");

    const done = item.executionStatus === "DONE";
    const id = await this.prisma
      .$transaction(async (tx) => {
        const created = await tx.externalWorkItem.create({
          data: {
            ...item,
            workspaceId: auth.workspaceId,
            completedAt: done ? new Date() : null,
            tracking: {
              create: {
                executingTeamId: executingTeamId ?? null,
                developerId: developerId ?? null,
                committedDate: fromIsoDate(committedDate) ?? null,
                manualForecastDate: fromIsoDate(manualForecastDate) ?? null,
                healthStatus: manualHealth ?? null,
                // Entrega concluída não consome capacidade futura (§14.5, RN-035).
                remainingEffortHours: done ? 0 : (remainingEffortHours ?? null),
                statusSource: statusSource ?? null,
                statusNote: statusNote ?? null,
                // Cadastrar é verificar o item agora.
                lastCheckedAt: new Date(),
              },
            },
            refinement: {
              create: {
                checkItems: {
                  createMany: { data: DEFAULT_READINESS_CHECKLIST.map((label, position) => ({ label, position })) },
                },
              },
            },
          },
        });
        await recordTrackingSnapshot(tx, created.id, auth.userId, ["created"]);
        await this.audit.record(
          {
            action: "work_item.created",
            entityType: "work_item",
            entityId: created.id,
            workspaceId: auth.workspaceId,
            actorUserId: auth.userId,
            metadata: { sourceId: item.sourceId, projectId: item.projectId },
          },
          tx,
        );
        return created.id;
      })
      .catch((error: unknown) => {
        throw isUniqueViolation(error) ? duplicateKey(item.externalKey) : error;
      });
    return this.get(auth, id);
  }

  async update(auth: AuthContext, id: string, input: UpdateInput): Promise<WorkItemDetail> {
    const {
      version,
      executionStatus,
      executingTeamId,
      developerId,
      committedDate,
      manualForecastDate,
      manualHealth,
      remainingEffortHours,
      statusSource,
      statusNote,
      ...itemFields
    } = input;
    const current = await this.prisma.externalWorkItem.findFirst({
      where: { id, workspaceId: auth.workspaceId },
      include: { tracking: true },
    });
    if (!current) throw notFound(ENTITY);
    const t = current.tracking;

    // Só valores novos passam pelas regras de contexto ativo; os antigos continuam válidos.
    if (itemFields.sourceId && itemFields.sourceId !== current.sourceId) await this.assertSource(auth, itemFields.sourceId);
    if (itemFields.projectId && itemFields.projectId !== current.projectId) {
      await assertProjectsOpen(this.prisma, auth.workspaceId, [itemFields.projectId], "projectId");
    }
    if (executingTeamId && executingTeamId !== t?.executingTeamId) {
      await assertTeamsActive(this.prisma, auth.workspaceId, [executingTeamId], "executingTeamId");
    }
    if (developerId && developerId !== t?.developerId) {
      await assertDeveloperActive(this.prisma, auth.workspaceId, developerId, "developerId");
    }

    const relevant: string[] = [];
    const itemData: Prisma.ExternalWorkItemUpdateManyMutationInput = { ...itemFields, version: { increment: 1 } };
    const completing = executionStatus === "DONE" && current.executionStatus !== "DONE";
    if (executionStatus && executionStatus !== current.executionStatus) {
      itemData.executionStatus = executionStatus;
      itemData.completedAt = executionStatus === "DONE" ? new Date() : null;
      relevant.push("executionStatus");
    }

    const trackingData: Prisma.DeliveryTrackingUncheckedUpdateInput = {};
    const setIfChanged = <K extends keyof Prisma.DeliveryTrackingUncheckedUpdateInput>(
      key: K,
      next: Prisma.DeliveryTrackingUncheckedUpdateInput[K] | undefined,
      same: boolean,
      field: string,
    ) => {
      if (next === undefined || same) return;
      trackingData[key] = next;
      relevant.push(field);
    };
    setIfChanged("executingTeamId", executingTeamId, executingTeamId === t?.executingTeamId, "executingTeam");
    setIfChanged("developerId", developerId, developerId === t?.developerId, "developer");
    setIfChanged("committedDate", fromIsoDate(committedDate), committedDate === toIsoDate(t?.committedDate ?? null), "committedDate");
    setIfChanged(
      "manualForecastDate",
      fromIsoDate(manualForecastDate),
      manualForecastDate === toIsoDate(t?.manualForecastDate ?? null),
      "manualForecastDate",
    );
    setIfChanged("healthStatus", manualHealth, manualHealth === t?.healthStatus, "manualHealth");
    const currentRemaining = toNumberOrNull(t?.remainingEffortHours ?? null);
    const nextRemaining = completing ? 0 : remainingEffortHours;
    setIfChanged("remainingEffortHours", nextRemaining, nextRemaining === currentRemaining, "remainingEffortHours");
    setIfChanged("statusNote", statusNote, statusNote === t?.statusNote, "statusNote");
    if (statusSource !== undefined) trackingData.statusSource = statusSource;

    // Atualizar o acompanhamento é verificá-lo (§14.2 "registrar última verificação").
    const touchesTracking = [executingTeamId, developerId, committedDate, manualForecastDate, manualHealth, remainingEffortHours, statusSource, statusNote].some(
      (value) => value !== undefined,
    );
    if (touchesTracking || executionStatus !== undefined) trackingData.lastCheckedAt = new Date();

    await this.prisma
      .$transaction(async (tx) => {
        const result = await tx.externalWorkItem.updateMany({ where: { id, workspaceId: auth.workspaceId, version }, data: itemData });
        if (result.count === 0) throw versionConflict(ENTITY);
        if (Object.keys(trackingData).length) await tx.deliveryTracking.update({ where: { workItemId: id }, data: trackingData });
        if (relevant.length) await recordTrackingSnapshot(tx, id, auth.userId, relevant);
        await this.audit.record(
          {
            action: "work_item.updated",
            entityType: "work_item",
            entityId: id,
            workspaceId: auth.workspaceId,
            actorUserId: auth.userId,
            metadata: {
              fields: changedFields({ ...input }),
              fromVersion: version,
              ...(itemData.executionStatus && { fromStatus: current.executionStatus, toStatus: executionStatus }),
            },
          },
          tx,
        );
      })
      .catch((error: unknown) => {
        throw isUniqueViolation(error) ? duplicateKey(itemFields.externalKey ?? current.externalKey) : error;
      });
    return this.get(auth, id);
  }

  /** Registra a verificação sem alterar dados (§14.2). Não muda a versão: nada foi editado. */
  async check(auth: AuthContext, id: string): Promise<WorkItemDetail> {
    const item = await this.prisma.externalWorkItem.findFirst({
      where: { id, workspaceId: auth.workspaceId },
      select: { executionStatus: true },
    });
    if (!item) throw notFound(ENTITY);
    await this.prisma.$transaction(async (tx) => {
      await tx.deliveryTracking.update({ where: { workItemId: id }, data: { lastCheckedAt: new Date() } });
      await this.audit.record(
        { action: "work_item.checked", entityType: "work_item", entityId: id, workspaceId: auth.workspaceId, actorUserId: auth.userId },
        tx,
      );
    });
    return this.get(auth, id);
  }

  /** Item que precisa existir no workspace e ter execução aberta para entrar em sprint/release. */
  async assertPlannable(auth: AuthContext, id: string): Promise<{ id: string; executionStatus: string }> {
    const item = await this.prisma.externalWorkItem.findFirst({
      where: { id, workspaceId: auth.workspaceId },
      select: { id: true, executionStatus: true },
    });
    if (!item) throw notFound(ENTITY);
    if (isClosedExecution(item.executionStatus)) {
      throw ruleViolation("Itens concluídos ou cancelados não entram em novos planejamentos.", "workItemId");
    }
    return item;
  }

  private async assertSource(auth: AuthContext, sourceId: string): Promise<void> {
    const source = await this.prisma.externalSource.findFirst({ where: { id: sourceId, workspaceId: auth.workspaceId } });
    if (!source) throw ruleViolation("Origem não encontrada.", "sourceId");
  }
}
