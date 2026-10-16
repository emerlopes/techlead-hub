import { isNotReadyForImminentSprint, type Refinement, suggestsReady, type WorkItem } from "@tlh/shared-contracts";
import type { Prisma } from "../../generated/prisma/client";
import { toIsoDate, toIsoOrNull } from "../../common/persistence";

export const refinementInclude = {
  refinement: {
    include: {
      intendedSprint: { select: { id: true, name: true, status: true, startDate: true } },
      checkItems: { orderBy: { position: "asc" } },
    },
  },
} satisfies Prisma.ExternalWorkItemInclude;

type RefinementRow = Prisma.ExternalWorkItemGetPayload<{ include: typeof refinementInclude }>;

/** Refinamento é independente da execução (RN-007, CA-005): a situação vem do próprio item. */
export function toRefinementDto(row: RefinementRow, item: WorkItem, today: string): Refinement {
  const refinement = row.refinement;
  const checkItems = (refinement?.checkItems ?? []).map((check) => ({
    id: check.id,
    label: check.label,
    position: check.position,
    checked: check.checkedAt !== null,
    checkedAt: toIsoOrNull(check.checkedAt),
  }));
  const checklist = { total: checkItems.length, checked: checkItems.filter((c) => c.checked).length };
  const intended = refinement?.intendedSprint;
  const intendedSprint = intended ? { ...intended, startDate: toIsoDate(intended.startDate) ?? "" } : null;
  return {
    status: row.refinementStatus,
    intendedSprint,
    openQuestions: refinement?.openQuestions ?? null,
    pendingItems: refinement?.pendingItems ?? null,
    notes: refinement?.notes ?? null,
    readyExceptionReason: refinement?.readyExceptionReason ?? null,
    checkItems,
    checklist,
    suggestReady: suggestsReady(row.refinementStatus, checklist),
    notReadyForImminentSprint: isNotReadyForImminentSprint(
      {
        executionStatus: item.executionStatus,
        refinementStatus: item.refinementStatus,
        sprints: [item.currentSprint, intendedSprint].filter((s) => s !== null),
      },
      today,
    ),
    updatedAt: (refinement?.updatedAt ?? row.updatedAt).toISOString(),
  };
}
