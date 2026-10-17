import {
  dependencyState,
  type ExecutionPlan,
  isClosedExecution,
  type PlanWorkItem,
  type WorkDependency,
} from "@tlh/shared-contracts";
import type { Prisma } from "../../generated/prisma/client";
import { toIsoDate, toNumberOrNull } from "../../common/persistence";
import { openRiskWhere, refSelect } from "../work-items/work-item.mapper";

const developerRef = { select: { id: true, name: true } } as const;

/** O que o plano precisa do item externo: execução, esforço restante, responsável e impedimentos. */
export const planWorkItemSelect = {
  id: true,
  externalKey: true,
  title: true,
  executionStatus: true,
  projectId: true,
  project: { select: refSelect },
  tracking: { select: { remainingEffortHours: true, developer: developerRef } },
  riskLinks: { where: openRiskWhere, select: { risk: { select: { type: true, blockingLevel: true } } } },
} satisfies Prisma.ExternalWorkItemSelect;
export type PlanWorkItemRow = Prisma.ExternalWorkItemGetPayload<{ select: typeof planWorkItemSelect }>;

export const planInclude = {
  developer: developerRef,
  team: { select: refSelect },
  project: { select: refSelect },
  items: { orderBy: { position: "asc" }, include: { workItem: { select: planWorkItemSelect } } },
} satisfies Prisma.ExecutionPlanInclude;
export type PlanRow = Prisma.ExecutionPlanGetPayload<{ include: typeof planInclude }>;

/** Impedimento aberto mais forte (§16.4): sem nível declarado conta como bloqueio total. */
export function blockingOf(row: PlanWorkItemRow): "FULL" | "PARTIAL" | null {
  const impediments = row.riskLinks.map((l) => l.risk).filter((r) => r.type === "IMPEDIMENT");
  if (impediments.some((r) => r.blockingLevel !== "PARTIAL")) return "FULL";
  return impediments.length > 0 ? "PARTIAL" : null;
}

export function toPlanWorkItem(row: PlanWorkItemRow): PlanWorkItem {
  return {
    id: row.id,
    externalKey: row.externalKey,
    title: row.title,
    executionStatus: row.executionStatus,
    project: row.project,
    developer: row.tracking?.developer ?? null,
    remainingHours: toNumberOrNull(row.tracking?.remainingEffortHours ?? null),
    blocking: blockingOf(row),
  };
}

export function toPlanSummary(row: PlanRow): ExecutionPlan {
  return {
    id: row.id,
    developer: row.developer,
    team: row.team,
    project: row.project,
    startDate: toIsoDate(row.startDate) ?? "",
    endDate: toIsoDate(row.endDate) ?? "",
    executionMode: row.executionMode,
    maxParallelItems: row.maxParallelItems,
    redistributionPolicy: row.redistributionPolicy,
    status: row.status,
    notes: row.notes,
    itemCount: row.items.length,
    openItemCount: row.items.filter((i) => !isClosedExecution(i.workItem.executionStatus)).length,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    version: row.version,
  };
}

const dependencyItemSelect = { id: true, externalKey: true, title: true, executionStatus: true, project: { select: refSelect } } as const;

export const dependencyInclude = {
  predecessor: { select: dependencyItemSelect },
  successor: { select: dependencyItemSelect },
} satisfies Prisma.WorkDependencyInclude;
export type DependencyRow = Prisma.WorkDependencyGetPayload<{ include: typeof dependencyInclude }>;

export function toDependencyDto(row: DependencyRow): WorkDependency {
  const expectedReleaseDate = toIsoDate(row.expectedReleaseDate);
  return {
    id: row.id,
    dependencyType: row.dependencyType,
    predecessor: row.predecessor,
    successor: row.successor,
    externalReference: row.externalReference,
    expectedReleaseDate,
    actualReleaseDate: toIsoDate(row.actualReleaseDate),
    status: row.status,
    state: dependencyState({
      type: row.dependencyType,
      status: row.status,
      expectedReleaseDate,
      predecessorClosed: row.predecessor ? isClosedExecution(row.predecessor.executionStatus) : null,
    }),
    notes: row.notes,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    version: row.version,
  };
}

/** Já não restringe nada: liberada ou com predecessor encerrado. */
export function isResolvedDependency(dep: WorkDependency): boolean {
  return dep.state === "RELEASED" || (dep.predecessor !== null && isClosedExecution(dep.predecessor.executionStatus));
}
