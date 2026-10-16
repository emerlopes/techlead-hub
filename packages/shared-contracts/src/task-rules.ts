import type { TaskDueState, TaskPriorityValue, TaskStatusValue } from "./tasks";

/** Horizonte de "próximos vencimentos" do dashboard (§5.2.2), em dias corridos. */
export const UPCOMING_DAYS = 7;

const OPEN_STATUSES: readonly TaskStatusValue[] = ["TODO", "IN_PROGRESS", "BLOCKED"];

export function isOpenTask(status: TaskStatusValue): boolean {
  return OPEN_STATUSES.includes(status);
}

/** Data de hoje (`YYYY-MM-DD`) no fuso informado (§35.3). */
export function todayIn(timeZone: string, now: Date = new Date()): string {
  // en-CA formata como YYYY-MM-DD.
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

export function addDays(isoDate: string, days: number): string {
  const date = new Date(`${isoDate}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

/**
 * Alerta de prazo. Atividades concluídas ou canceladas nunca ficam atrasadas (RN-001, CA-003);
 * sem prazo não há alerta (§3.4).
 */
export function dueStateOf(
  task: { status: TaskStatusValue; dueDate: string | null },
  today: string,
  upcomingDays: number = UPCOMING_DAYS,
): TaskDueState | null {
  if (!task.dueDate || !isOpenTask(task.status)) return null;
  if (task.dueDate < today) return "OVERDUE";
  if (task.dueDate === today) return "DUE_TODAY";
  if (task.dueDate <= addDays(today, upcomingDays)) return "DUE_SOON";
  return null;
}

export const PRIORITY_RANK: Record<TaskPriorityValue, number> = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3 };

type SortableTask = {
  priority: TaskPriorityValue;
  dueDate: string | null;
  dueState: TaskDueState | null;
  focus: { position: number; isPrimary: boolean } | null;
  createdAt: string;
};

function bucket(task: SortableTask): number {
  if (task.focus?.isPrimary) return 0;
  if (task.focus) return 1;
  if (task.dueState === "OVERDUE") return 2;
  if (task.priority === "CRITICAL") return 3;
  if (task.dueState) return 4;
  return 5;
}

/**
 * Ordenação padrão (§6.7): foco principal → demais em foco → atrasadas → críticas →
 * próximas do vencimento → demais. Desempate: posição na fila, prazo, prioridade, criação.
 */
export function compareTasksDefault(a: SortableTask, b: SortableTask): number {
  const byBucket = bucket(a) - bucket(b);
  if (byBucket !== 0) return byBucket;
  if (a.focus && b.focus) return a.focus.position - b.focus.position;
  if (a.dueDate !== b.dueDate) {
    if (a.dueDate === null) return 1;
    if (b.dueDate === null) return -1;
    return a.dueDate < b.dueDate ? -1 : 1;
  }
  const byPriority = PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority];
  if (byPriority !== 0) return byPriority;
  return a.createdAt.localeCompare(b.createdAt);
}
