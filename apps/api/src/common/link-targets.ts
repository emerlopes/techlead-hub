import type { Prisma } from "../generated/prisma/client";
import { ruleViolation } from "./persistence";

/** Contextos que riscos e acontecimentos do diário podem referenciar (§16.2, §17.3). */
const targets = {
  workItemIds: { column: "workItemId", label: "Item externo" },
  sprintIds: { column: "sprintId", label: "Sprint" },
  releaseIds: { column: "releaseId", label: "Release" },
  projectIds: { column: "projectId", label: "Projeto" },
  teamIds: { column: "teamId", label: "Time" },
  taskIds: { column: "taskId", label: "Atividade" },
  riskIds: { column: "riskId", label: "Risco" },
} as const;

export type LinkInput = Partial<Record<keyof typeof targets, string[]>>;
export type LinkColumn = (typeof targets)[keyof typeof targets]["column"];

type Db = Pick<Prisma.TransactionClient, "externalWorkItem" | "sprint" | "release" | "project" | "team" | "task" | "risk">;

/** Vínculos só apontam para entidades do mesmo workspace (RNF-007). */
export async function assertLinkTargets(db: Db, workspaceId: string, input: LinkInput): Promise<void> {
  const where = (ids: string[]) => ({ where: { id: { in: ids }, workspaceId } });
  const counters: Record<keyof typeof targets, (ids: string[]) => Promise<number>> = {
    workItemIds: (ids) => db.externalWorkItem.count(where(ids)),
    sprintIds: (ids) => db.sprint.count(where(ids)),
    releaseIds: (ids) => db.release.count(where(ids)),
    projectIds: (ids) => db.project.count(where(ids)),
    teamIds: (ids) => db.team.count(where(ids)),
    taskIds: (ids) => db.task.count(where(ids)),
    riskIds: (ids) => db.risk.count(where(ids)),
  };
  for (const key of Object.keys(input) as (keyof typeof targets)[]) {
    const ids = input[key];
    if (!ids?.length) continue;
    if ((await counters[key](ids)) !== ids.length) {
      throw ruleViolation(`${targets[key].label} não encontrado(a).`, `links.${key}`);
    }
  }
}

/**
 * Diferença entre os vínculos enviados e os atuais, por tipo: cada lista enviada substitui a anterior
 * daquele tipo; tipos omitidos não mudam.
 */
export function linkChanges(input: LinkInput): { column: LinkColumn; ids: string[] }[] {
  return (Object.keys(input) as (keyof typeof targets)[]).flatMap((key) => {
    const ids = input[key];
    return ids ? [{ column: targets[key].column, ids }] : [];
  });
}
