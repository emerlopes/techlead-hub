import { Injectable } from "@nestjs/common";
import {
  CALCULATED_DEPENDENCY_TYPES,
  computeCapacity,
  contextCapacityByDay,
  dependencyState,
  type ExecutionPlanDetail,
  isClosedExecution,
  type PlanConstraint,
  type PlanIssue,
  type PlanItemConstraint,
  planIssueTypes,
  projectionIssues,
  type SimPlan,
  simulateExecution,
} from "@tlh/shared-contracts";
import type { Prisma } from "../../generated/prisma/client";
import { workspaceToday } from "../../common/context-rules";
import { fromIsoDate, toIsoDate, toNumberOrNull } from "../../common/persistence";
import { PrismaService } from "../../infrastructure/prisma/prisma.service";
import { AuditService } from "../audit/audit.service";
import {
  allocationInclude,
  datesOverlap,
  exceptionInclude,
  toAllocationDto,
  toAllocationRule,
  toExceptionRule,
  toScheduleRule,
  validityOverlaps,
} from "../capacity/capacity.mapper";
import type { AuthContext } from "../identity/auth-context";
import { blockingOf, planInclude, type PlanRow, toPlanSummary, toPlanWorkItem } from "./planning.mapper";

const date = (value: Date) => toIsoDate(value) ?? "";
const later = (a: string, b: string) => (a > b ? a : b);
const sameContext = (a: { teamId: string | null; projectId: string | null }, b: { teamId: string | null; projectId: string | null }) =>
  a.teamId === b.teamId && a.projectId === b.projectId;

const constraintInclude = {
  predecessor: { select: { id: true, externalKey: true, title: true, executionStatus: true } },
} satisfies Prisma.WorkDependencyInclude;
type ConstraintRow = Prisma.WorkDependencyGetPayload<{ include: typeof constraintInclude }>;

/**
 * Monta o detalhe do plano com a projeção da execução (§22, §23). A projeção é derivada na leitura,
 * com todos os planos ativos do workspace juntos: dependências entre pessoas e a redistribuição entre
 * contextos da mesma pessoa usam o mesmo cálculo. Mudanças de fila, paralelismo, dependência,
 * bloqueio, esforço ou capacidade valem na próxima consulta (§43.1); o recálculo assíncrono e o
 * histórico de previsões chegam com o motor de previsão (Etapa 6).
 */
@Injectable()
export class PlanProjectionService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async detail(auth: AuthContext, plan: PlanRow): Promise<ExecutionPlanDetail> {
    const today = await workspaceToday(this.prisma, auth.workspaceId);
    const projectable = plan.status !== "ARCHIVED" && date(plan.endDate) >= today;

    // Os ativos vêm antes: o predecessor de um item é procurado primeiro neles.
    const others = projectable
      ? await this.prisma.executionPlan.findMany({
          where: { workspaceId: auth.workspaceId, status: "ACTIVE", endDate: { gte: fromIsoDate(today) as Date }, id: { not: plan.id } },
          include: planInclude,
          orderBy: { createdAt: "asc" },
        })
      : [];
    const isolated = plan.status !== "ACTIVE";
    const simRows = isolated ? [...others, plan] : [...others, plan].sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());

    const activeWorkItems = new Set(simRows.filter((p) => p.status === "ACTIVE").flatMap((p) => p.items.map((i) => i.workItemId)));
    const ownWorkItems = new Set(plan.items.map((i) => i.workItemId));
    const allWorkItemIds = [...new Set(simRows.flatMap((p) => p.items.map((i) => i.workItemId)))];

    const [dependencies, capacity, history] = await Promise.all([
      this.prisma.workDependency.findMany({
        where: { workspaceId: auth.workspaceId, successorId: { in: projectable ? allWorkItemIds : [...ownWorkItems] } },
        include: constraintInclude,
        orderBy: { createdAt: "asc" },
      }),
      this.capacityInputs(auth, simRows, today),
      this.audit.history(auth.workspaceId, "execution_plan", plan.id),
    ]);
    const bySuccessor = new Map<string, ConstraintRow[]>();
    for (const dep of dependencies) bySuccessor.set(dep.successorId, [...(bySuccessor.get(dep.successorId) ?? []), dep]);

    /** Restrições que o cálculo respeita (§24.4): o resto é só registrado. */
    const constraintsOf = (workItemId: string, scheduled: ReadonlySet<string>): PlanConstraint[] =>
      (bySuccessor.get(workItemId) ?? []).flatMap((dep): PlanConstraint[] => {
        if (!CALCULATED_DEPENDENCY_TYPES.includes(dep.dependencyType)) return [];
        if (dep.dependencyType === "EXTERNAL") {
          if (dep.status === "RELEASED") return [];
          return dep.expectedReleaseDate ? [{ kind: "DATE", date: date(dep.expectedReleaseDate) }] : [{ kind: "UNKNOWN" }];
        }
        const predecessor = dep.predecessor;
        if (!predecessor || isClosedExecution(predecessor.executionStatus)) return [];
        // Predecessor fora de qualquer plano ativo: não há como saber quando termina (CA-018).
        return scheduled.has(predecessor.id) ? [{ kind: "ITEM", workItemId: predecessor.id }] : [{ kind: "UNKNOWN" }];
      });

    const ownScheduled = new Set([...activeWorkItems, ...(isolated ? ownWorkItems : [])]);
    const simPlans: SimPlan[] = simRows.map((row) => {
      const scheduled = row.id === plan.id ? ownScheduled : activeWorkItems;
      const from = later(date(row.startDate), today);
      const to = date(row.endDate);
      const inputs = capacity.get(row.developerId);
      return {
        id: row.id,
        developerId: row.developerId,
        mode: row.executionMode,
        maxParallel: row.maxParallelItems,
        policy: row.redistributionPolicy,
        from: date(row.startDate),
        to,
        isolated: row.status !== "ACTIVE",
        capacity: inputs
          ? contextCapacityByDay({
              from,
              to,
              schedules: inputs.schedules,
              exceptions: inputs.exceptions,
              allocations: inputs.allocations.filter((a) => sameContext(a, row)).map((a) => a.rule),
            })
          : {},
        items: row.items.map((i) => ({
          id: i.id,
          workItemId: i.workItemId,
          share: toNumberOrNull(i.capacityShare),
          earliestStart: toIsoDate(i.earliestStartDate),
          closed: isClosedExecution(i.workItem.executionStatus),
          remaining: toNumberOrNull(i.workItem.tracking?.remainingEffortHours ?? null),
          blocking: blockingOf(i.workItem),
          constraints: constraintsOf(i.workItemId, scheduled),
        })),
      };
    });

    const result = projectable ? simulateExecution(simPlans, today) : {};
    const projection = result[plan.id] ?? null;
    const own = simPlans.find((p) => p.id === plan.id) as SimPlan;
    const inputs = capacity.get(plan.developerId);
    const from = later(date(plan.startDate), today);
    const to = date(plan.endDate);
    // Horas de cada alocação no período projetado e conflitos de alocação da pessoa (§20.5).
    const computed =
      inputs && projectable
        ? computeCapacity({ from, to, schedules: inputs.schedules, exceptions: inputs.exceptions, allocations: inputs.allocations.map((a) => a.rule) })
        : null;

    const issues: PlanIssue[] = projection ? projectionIssues(own, projection) : [];
    if (computed?.issues.some((t) => t === "OVER_ALLOCATED" || t === "PERCENTAGE_OVER_LIMIT")) issues.push({ type: "CAPACITY_CONFLICT", itemIds: [] });
    const mismatch = plan.items
      .filter((i) => !isClosedExecution(i.workItem.executionStatus) && i.workItem.tracking?.developer && i.workItem.tracking.developer.id !== plan.developerId)
      .map((i) => i.id);
    if (projectable && mismatch.length > 0) issues.push({ type: "ASSIGNEE_MISMATCH", itemIds: mismatch });
    issues.sort((a, b) => planIssueTypes.indexOf(a.type) - planIssueTypes.indexOf(b.type));

    return {
      ...toPlanSummary(plan),
      items: plan.items.map((i) => ({
        id: i.id,
        position: i.position,
        workItem: toPlanWorkItem(i.workItem),
        capacityShare: toNumberOrNull(i.capacityShare),
        earliestStartDate: toIsoDate(i.earliestStartDate),
        notes: i.notes,
        constraints: (bySuccessor.get(i.workItemId) ?? []).map(toConstraint),
        projection: projection?.items[i.id] ?? null,
      })),
      projection: projection && {
        days: projection.days,
        capacityByDay: projection.capacityByDay,
        usedByDay: projection.usedByDay,
        capacityHours: projection.capacityHours,
        plannedHours: projection.plannedHours,
        idleHours: projection.idleHours,
        receivedHours: projection.receivedHours,
        donatedHours: projection.donatedHours,
        complete: projection.complete,
      },
      issues,
      contextAllocations: (inputs?.allocations ?? [])
        .filter((a) => sameContext(a, plan))
        .map((a) => ({ allocation: a.dto, hours: computed?.allocationHours[a.rule.id] ?? 0 })),
      history,
    };
  }

  /** Jornadas, ausências (com feriados do workspace) e alocações de cada pessoa dos planos simulados. */
  private async capacityInputs(auth: AuthContext, plans: readonly PlanRow[], today: string) {
    const developerIds = [...new Set(plans.map((p) => p.developerId))];
    const from = fromIsoDate(plans.reduce((min, p) => (date(p.startDate) < min ? date(p.startDate) : min), today)) as Date;
    const to = fromIsoDate(plans.reduce((max, p) => (date(p.endDate) > max ? date(p.endDate) : max), today)) as Date;
    const [developers, holidays] = await Promise.all([
      this.prisma.developer.findMany({
        where: { workspaceId: auth.workspaceId, id: { in: developerIds } },
        select: {
          id: true,
          name: true,
          schedules: { where: validityOverlaps(from, to), orderBy: { validFrom: "asc" } },
          exceptions: { where: { cancelledAt: null, ...datesOverlap(from, to) } },
          allocations: { where: validityOverlaps(from, to), include: allocationInclude, orderBy: { validFrom: "asc" } },
        },
      }),
      this.prisma.availabilityException.findMany({
        where: { workspaceId: auth.workspaceId, developerId: null, cancelledAt: null, ...datesOverlap(from, to) },
        include: exceptionInclude,
      }),
    ]);
    return new Map(
      developers.map((dev) => [
        dev.id,
        {
          schedules: dev.schedules.map(toScheduleRule),
          exceptions: [...dev.exceptions, ...holidays].map(toExceptionRule),
          allocations: dev.allocations.map((a) => ({
            teamId: a.teamId,
            projectId: a.projectId,
            rule: toAllocationRule(a),
            dto: toAllocationDto(a, today),
          })),
        },
      ]),
    );
  }
}

function toConstraint(dep: ConstraintRow): PlanItemConstraint {
  const expectedReleaseDate = toIsoDate(dep.expectedReleaseDate);
  return {
    dependencyId: dep.id,
    type: dep.dependencyType,
    state: dependencyState({
      type: dep.dependencyType,
      status: dep.status,
      expectedReleaseDate,
      predecessorClosed: dep.predecessor ? isClosedExecution(dep.predecessor.executionStatus) : null,
    }),
    predecessor: dep.predecessor && { id: dep.predecessor.id, externalKey: dep.predecessor.externalKey, title: dep.predecessor.title },
    externalReference: dep.externalReference,
    expectedReleaseDate,
  };
}
