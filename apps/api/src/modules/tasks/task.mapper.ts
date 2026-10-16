import { dueStateOf, type Task } from "@tlh/shared-contracts";
import type { Prisma } from "../../generated/prisma/client";
import { toIsoDate, toIsoOrNull, toNumberOrNull } from "../../common/persistence";

const refSelect = { id: true, code: true, name: true } as const;

export const taskInclude = {
  teams: { select: { team: { select: refSelect } }, orderBy: { team: { code: "asc" } } },
  projects: { select: { project: { select: refSelect } }, orderBy: { project: { code: "asc" } } },
  focus: { select: { position: true, isPrimary: true } },
} satisfies Prisma.TaskInclude;

export type TaskRow = Prisma.TaskGetPayload<{ include: typeof taskInclude }>;

/** `today` vem do fuso do workspace para que o alerta de prazo não dependa do servidor. */
export function toTaskDto(row: TaskRow, today: string): Task {
  const dueDate = toIsoDate(row.dueDate);
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    type: row.type,
    status: row.status,
    priority: row.priority,
    dueDate,
    nextAction: row.nextAction,
    blockedReason: row.blockedReason,
    estimatedHours: toNumberOrNull(row.estimatedHours),
    actualHours: toNumberOrNull(row.actualHours),
    completedAt: toIsoOrNull(row.completedAt),
    cancelledAt: toIsoOrNull(row.cancelledAt),
    teams: row.teams.map((link) => link.team),
    projects: row.projects.map((link) => link.project),
    focus: row.focus,
    dueState: dueStateOf({ status: row.status, dueDate }, today),
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    version: row.version,
  };
}
