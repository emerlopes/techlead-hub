import {
  calculateDeliveryHealth,
  effectiveHealth,
  HEALTH_RANK,
  isClosedExecution,
  isTrackingStale,
  OPEN_RISK_STATUSES,
  type WorkItem,
} from "@tlh/shared-contracts";
import type { Prisma } from "../../generated/prisma/client";
import { toIsoDate, toIsoOrNull, toNumberOrNull } from "../../common/persistence";

export const refSelect = { id: true, code: true, name: true } as const;

/** Riscos e impedimentos abertos que entram no cálculo de saúde (§16.4). */
export const openRiskWhere = { risk: { status: { in: [...OPEN_RISK_STATUSES] } } } satisfies Prisma.RiskLinkWhereInput;
const riskSignalSelect = { id: true, title: true, type: true, severity: true, blockingLevel: true } as const;

export const workItemInclude = {
  source: { select: { id: true, name: true } },
  project: { select: refSelect },
  tracking: { include: { executingTeam: { select: refSelect }, developer: { select: { id: true, name: true } } } },
  sprintMemberships: {
    where: { exitedAt: null },
    select: { scopeType: true, sprint: { select: { id: true, name: true, status: true, startDate: true } } },
  },
  releaseMemberships: {
    where: { removedAt: null },
    select: { isRequired: true, release: { select: { id: true, name: true } } },
    orderBy: { addedAt: "asc" },
  },
  riskLinks: { where: openRiskWhere, select: { risk: { select: riskSignalSelect } } },
} satisfies Prisma.ExternalWorkItemInclude;

export type WorkItemRow = Prisma.ExternalWorkItemGetPayload<{ include: typeof workItemInclude }>;

/**
 * `today` (fuso do workspace) e `now` entram de fora para que o cálculo seja determinístico e não
 * dependa do relógio do servidor no meio da montagem de uma lista.
 */
export function toWorkItemDto(row: WorkItemRow, today: string, now: Date): WorkItem {
  const closed = isClosedExecution(row.executionStatus);
  const tracking = row.tracking;
  const committedDate = toIsoDate(tracking?.committedDate ?? null);
  const manualForecastDate = toIsoDate(tracking?.manualForecastDate ?? null);
  const openRisks = row.riskLinks.map((link) => link.risk);
  const calculatedHealth = calculateDeliveryHealth(
    { executionStatus: row.executionStatus, committedDate, forecastDate: manualForecastDate, openRisks },
    today,
  );
  const manualHealth = tracking?.healthStatus ?? null;
  const lastCheckedAt = toIsoOrNull(tracking?.lastCheckedAt ?? null);
  const current = row.sprintMemberships[0];

  return {
    id: row.id,
    source: row.source,
    externalKey: row.externalKey,
    title: row.title,
    externalUrl: row.externalUrl,
    itemType: row.itemType,
    project: row.project,
    executionStatus: row.executionStatus,
    refinementStatus: row.refinementStatus,
    notes: row.notes,
    completedAt: toIsoOrNull(row.completedAt),
    tracking: {
      executingTeam: tracking?.executingTeam ?? null,
      developer: tracking?.developer ?? null,
      committedDate,
      manualForecastDate,
      manualHealth,
      calculatedHealth,
      health: effectiveHealth(closed, manualHealth, calculatedHealth),
      remainingEffortHours: toNumberOrNull(tracking?.remainingEffortHours ?? null),
      lastCheckedAt,
      stale: isTrackingStale(closed, lastCheckedAt, now),
      statusSource: tracking?.statusSource ?? null,
      statusNote: tracking?.statusNote ?? null,
      updatedAt: (tracking?.updatedAt ?? row.updatedAt).toISOString(),
    },
    currentSprint: current
      ? {
          id: current.sprint.id,
          name: current.sprint.name,
          status: current.sprint.status,
          startDate: toIsoDate(current.sprint.startDate) ?? "",
          scopeType: current.scopeType,
        }
      : null,
    releases: row.releaseMemberships.map((m) => ({ ...m.release, isRequired: m.isRequired })),
    openRisks,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    version: row.version,
  };
}

/**
 * O que exige ação primeiro (§5.2.3): saúde mais grave, depois compromisso mais próximo; encerrados
 * por último. Desempate pelo identificador externo para ordem estável.
 */
export function compareWorkItems(a: WorkItem, b: WorkItem): number {
  const rank = (item: WorkItem) => (item.tracking.health ? HEALTH_RANK[item.tracking.health] : 9);
  const byHealth = rank(a) - rank(b);
  if (byHealth !== 0) return byHealth;
  const ca = a.tracking.committedDate;
  const cb = b.tracking.committedDate;
  if (ca !== cb) {
    if (ca === null) return 1;
    if (cb === null) return -1;
    return ca < cb ? -1 : 1;
  }
  return a.externalKey.localeCompare(b.externalKey, "pt-BR", { numeric: true });
}
