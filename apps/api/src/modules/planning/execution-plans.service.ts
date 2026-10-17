import { Injectable } from "@nestjs/common";
import {
  type createExecutionPlanSchema,
  defaultMaxParallel,
  type ExecutionModeValue,
  type ExecutionPlan,
  type ExecutionPlanDetail,
  type ExecutionPlanStatusValue,
  isClosedExecution,
  type planListQuerySchema,
  planShapeIssues,
  type updateExecutionPlanSchema,
} from "@tlh/shared-contracts";
import type { z } from "zod";
import type { Prisma } from "../../generated/prisma/client";
import { ApiException } from "../../common/api-exception";
import { assertDeveloperActive, assertProjectsOpen, assertTeamsActive } from "../../common/context-rules";
import { fromIsoDate, isUniqueViolation, notFound, ruleViolation, toIsoDate, toNumberOrNull, versionConflict } from "../../common/persistence";
import { PrismaService } from "../../infrastructure/prisma/prisma.service";
import { AuditService } from "../audit/audit.service";
import type { AuthContext } from "../identity/auth-context";
import { PlanProjectionService } from "./plan-projection.service";
import { planInclude, type PlanRow, toPlanSummary } from "./planning.mapper";

const ENTITY = "Plano de execução";
type Tx = Prisma.TransactionClient;

type QueueItem = {
  workItemId: string;
  capacityShare?: number | null;
  earliestStartDate?: string | null;
  notes?: string | null;
};

type PlanState = {
  developerId: string;
  teamId: string | null;
  projectId: string | null;
  startDate: string;
  endDate: string;
  executionMode: ExecutionModeValue;
  maxParallelItems: number;
  status: ExecutionPlanStatusValue;
  items: QueueItem[];
};

function activeContextTaken(): ApiException {
  return new ApiException(
    409,
    "CONFLICT",
    "Esta pessoa já tem um plano ativo neste contexto. Arquive-o ou deixe este como rascunho (RN-026).",
    { details: [{ path: "status", message: "Já existe um plano ativo para a pessoa neste time e projeto." }] },
  );
}

/**
 * Planos de execução (§22): fila explícita, paralelismo limitado e política de redistribuição. Regras
 * que impedem salvar (parcelas acima de 100%, item repetido, contexto inativo) devolvem `422`; o resto
 * é sinalizado na projeção para o Tech Lead decidir (§3.5). A fila não interfere na fila de foco
 * pessoal (§22.5): são tabelas e regras separadas.
 */
@Injectable()
export class ExecutionPlansService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly projection: PlanProjectionService,
  ) {}

  async list(auth: AuthContext, query: z.output<typeof planListQuerySchema>): Promise<ExecutionPlan[]> {
    const rows = await this.prisma.executionPlan.findMany({
      where: {
        workspaceId: auth.workspaceId,
        developerId: query.developerId,
        teamId: query.teamId,
        projectId: query.projectId,
        ...(query.workItemId && { items: { some: { workItemId: query.workItemId } } }),
        ...(query.scope === "current" && { status: { in: ["DRAFT", "ACTIVE"] } }),
        ...(query.scope === "archived" && { status: "ARCHIVED" }),
      },
      include: planInclude,
      orderBy: [{ developer: { name: "asc" } }, { status: "asc" }, { startDate: "asc" }],
    });
    return rows.map(toPlanSummary);
  }

  async get(auth: AuthContext, id: string): Promise<ExecutionPlanDetail> {
    return this.projection.detail(auth, await this.load(auth, id));
  }

  async create(auth: AuthContext, input: z.output<typeof createExecutionPlanSchema>): Promise<ExecutionPlanDetail> {
    await assertDeveloperActive(this.prisma, auth.workspaceId, input.developerId, "developerId");
    if (input.teamId) await assertTeamsActive(this.prisma, auth.workspaceId, [input.teamId], "teamId");
    if (input.projectId) await assertProjectsOpen(this.prisma, auth.workspaceId, [input.projectId], "projectId");
    const state: PlanState = {
      developerId: input.developerId,
      teamId: input.teamId ?? null,
      projectId: input.projectId ?? null,
      startDate: input.period.startDate,
      endDate: input.period.endDate,
      executionMode: input.executionMode,
      maxParallelItems: input.maxParallelItems,
      status: input.status,
      items: normalizeQueue(input.executionMode, input.items),
    };
    await this.assertQueue(auth, state, new Set());

    try {
      const id = await this.prisma.$transaction(async (tx) => {
        const plan = await tx.executionPlan.create({
          data: {
            workspaceId: auth.workspaceId,
            developerId: state.developerId,
            teamId: state.teamId,
            projectId: state.projectId,
            startDate: fromIsoDate(state.startDate) as Date,
            endDate: fromIsoDate(state.endDate) as Date,
            executionMode: state.executionMode,
            maxParallelItems: state.maxParallelItems,
            redistributionPolicy: input.redistributionPolicy,
            status: state.status,
            notes: input.notes ?? null,
          },
        });
        await writeQueue(tx, plan.id, state.items);
        await this.audit.record(
          {
            action: "execution_plan.created",
            entityType: "execution_plan",
            entityId: plan.id,
            workspaceId: auth.workspaceId,
            actorUserId: auth.userId,
            metadata: { developerId: state.developerId, executionMode: state.executionMode, items: state.items.length, toStatus: state.status },
          },
          tx,
        );
        return plan.id;
      });
      return this.get(auth, id);
    } catch (error) {
      throw isUniqueViolation(error) ? activeContextTaken() : error;
    }
  }

  /** A combinação final (atual + alterações) passa pelas mesmas regras da criação; `items` substitui a fila. */
  async update(auth: AuthContext, id: string, input: z.output<typeof updateExecutionPlanSchema>): Promise<ExecutionPlanDetail> {
    const { version, ...changes } = input;
    const current = await this.load(auth, id);
    const onlyStatus = Object.entries(changes).every(([key, value]) => value === undefined || key === "status");
    if (current.status === "ARCHIVED" && !onlyStatus) {
      throw ruleViolation("Plano arquivado não é alterado: reabra como rascunho antes de editar.", "status");
    }

    const mode = changes.executionMode ?? current.executionMode;
    const queueChanged = changes.items !== undefined || (mode === "SEQUENTIAL" && current.executionMode !== "SEQUENTIAL");
    const items = normalizeQueue(
      mode,
      changes.items ??
        current.items.map((i) => ({
          workItemId: i.workItemId,
          capacityShare: toNumberOrNull(i.capacityShare),
          earliestStartDate: toIsoDate(i.earliestStartDate),
          notes: i.notes,
        })),
    );
    const next: PlanState = {
      developerId: current.developerId,
      teamId: changes.teamId === undefined ? current.teamId : changes.teamId,
      projectId: changes.projectId === undefined ? current.projectId : changes.projectId,
      startDate: changes.period?.startDate ?? toIsoDate(current.startDate) ?? "",
      endDate: changes.period?.endDate ?? toIsoDate(current.endDate) ?? "",
      executionMode: mode,
      // Trocar de modo sem informar o limite usa o padrão do novo modo.
      maxParallelItems:
        changes.maxParallelItems ??
        (changes.executionMode && changes.executionMode !== current.executionMode ? defaultMaxParallel(mode, items.length) : current.maxParallelItems),
      status: changes.status ?? current.status,
      items,
    };
    for (const issue of planShapeIssues(next)) throw ruleViolation(issue.message, issue.path);
    if (next.teamId && next.teamId !== current.teamId) await assertTeamsActive(this.prisma, auth.workspaceId, [next.teamId], "teamId");
    if (next.projectId && next.projectId !== current.projectId) await assertProjectsOpen(this.prisma, auth.workspaceId, [next.projectId], "projectId");
    await this.assertQueue(auth, next, new Set(current.items.map((i) => i.workItemId)), id);

    const settings = {
      teamId: next.teamId,
      projectId: next.projectId,
      startDate: next.startDate,
      endDate: next.endDate,
      executionMode: next.executionMode,
      maxParallelItems: next.maxParallelItems,
      redistributionPolicy: changes.redistributionPolicy ?? current.redistributionPolicy,
      status: next.status,
      notes: changes.notes === undefined ? current.notes : changes.notes,
    };
    const before = {
      teamId: current.teamId,
      projectId: current.projectId,
      startDate: toIsoDate(current.startDate),
      endDate: toIsoDate(current.endDate),
      executionMode: current.executionMode,
      maxParallelItems: current.maxParallelItems,
      redistributionPolicy: current.redistributionPolicy,
      status: current.status,
      notes: current.notes,
    };
    const fields = (Object.keys(before) as (keyof typeof before)[]).filter((key) => before[key] !== settings[key]);
    if (fields.length === 0 && !queueChanged) return this.get(auth, id);

    try {
      await this.prisma.$transaction(async (tx) => {
        const result = await tx.executionPlan.updateMany({
          where: { id, workspaceId: auth.workspaceId, version },
          data: {
            ...settings,
            startDate: fromIsoDate(settings.startDate) as Date,
            endDate: fromIsoDate(settings.endDate) as Date,
            version: { increment: 1 },
          },
        });
        if (result.count === 0) throw versionConflict(ENTITY);
        if (queueChanged) {
          await tx.executionPlanItem.deleteMany({ where: { planId: id } });
          await writeQueue(tx, id, next.items);
        }
        await this.audit.record(
          {
            action: queueChanged && fields.length === 0 ? "execution_plan.queue_updated" : "execution_plan.updated",
            entityType: "execution_plan",
            entityId: id,
            workspaceId: auth.workspaceId,
            actorUserId: auth.userId,
            metadata: {
              fields: queueChanged ? [...fields, "items"] : fields,
              fromVersion: version,
              ...(settings.status !== current.status && { fromStatus: current.status, toStatus: settings.status }),
            },
          },
          tx,
        );
      });
    } catch (error) {
      throw isUniqueViolation(error) ? activeContextTaken() : error;
    }
    return this.get(auth, id);
  }

  /* ------------------------------------------------------------------------ */

  private async load(auth: AuthContext, id: string): Promise<PlanRow> {
    const row = await this.prisma.executionPlan.findFirst({ where: { id, workspaceId: auth.workspaceId }, include: planInclude });
    if (!row) throw notFound(ENTITY);
    return row;
  }

  /**
   * Itens novos precisam estar abertos (RN-035); com projeto no contexto, todos são desse projeto
   * (§3.2); um item só fica em um plano ativo, senão o esforço restante seria consumido duas vezes.
   */
  private async assertQueue(auth: AuthContext, plan: PlanState, existing: ReadonlySet<string>, planId?: string): Promise<void> {
    const ids = plan.items.map((i) => i.workItemId);
    if (ids.length > 0) {
      const rows = await this.prisma.externalWorkItem.findMany({
        where: { id: { in: ids }, workspaceId: auth.workspaceId },
        select: { id: true, externalKey: true, executionStatus: true, projectId: true, project: { select: { code: true } } },
      });
      for (const [index, workItemId] of ids.entries()) {
        const row = rows.find((r) => r.id === workItemId);
        const path = `items.${index}.workItemId`;
        if (!row) throw ruleViolation("Item não encontrado.", path);
        if (!existing.has(workItemId) && isClosedExecution(row.executionStatus)) {
          throw ruleViolation(`${row.externalKey} já está encerrado e não consome capacidade (RN-035).`, path);
        }
        if (plan.projectId && row.projectId !== plan.projectId) {
          throw ruleViolation(`${row.externalKey} é do projeto ${row.project.code}, fora do contexto do plano (§3.2).`, path);
        }
      }
    }
    if (plan.status !== "ACTIVE") return;

    const taken = await this.prisma.executionPlan.findFirst({
      where: {
        workspaceId: auth.workspaceId,
        status: "ACTIVE",
        developerId: plan.developerId,
        teamId: plan.teamId,
        projectId: plan.projectId,
        ...(planId && { id: { not: planId } }),
      },
      select: { id: true },
    });
    if (taken) throw activeContextTaken();
    if (ids.length === 0) return;
    const elsewhere = await this.prisma.executionPlanItem.findFirst({
      where: { workItemId: { in: ids }, plan: { workspaceId: auth.workspaceId, status: "ACTIVE", ...(planId && { id: { not: planId } }) } },
      select: { workItem: { select: { externalKey: true } }, plan: { select: { developer: { select: { name: true } } } } },
    });
    if (elsewhere) {
      throw ruleViolation(
        `${elsewhere.workItem.externalKey} já está no plano ativo de ${elsewhere.plan.developer.name}: o esforço seria contado duas vezes.`,
        "items",
      );
    }
  }
}

/** No sequencial as parcelas não se aplicam: o item da vez recebe toda a capacidade (§22.2). */
function normalizeQueue(mode: ExecutionModeValue, items: readonly QueueItem[]): QueueItem[] {
  return items.map((item) => ({ ...item, capacityShare: mode === "SEQUENTIAL" ? null : (item.capacityShare ?? null) }));
}

async function writeQueue(tx: Tx, planId: string, items: readonly QueueItem[]): Promise<void> {
  if (items.length === 0) return;
  await tx.executionPlanItem.createMany({
    data: items.map((item, index) => ({
      planId,
      workItemId: item.workItemId,
      position: index + 1,
      capacityShare: item.capacityShare ?? null,
      earliestStartDate: fromIsoDate(item.earliestStartDate ?? null) ?? null,
      notes: item.notes ?? null,
    })),
  });
}
