import { FOCUS_QUEUE_LIMIT, type FocusQueue, type UpdateFocusQueueInput } from "@tlh/shared-contracts";

/** Estado da fila no formato do `PUT /focus-queue` (§36.6): ordem manual + foco principal. */
export type QueueState = UpdateFocusQueueInput;

export function toQueueState(queue: FocusQueue): QueueState {
  const primary = queue.items.find((item) => item.isPrimary);
  return { taskIds: queue.items.map((item) => item.task.id), primaryTaskId: primary?.task.id ?? null };
}

export function canAdd(queue: QueueState, taskId: string): boolean {
  return !queue.taskIds.includes(taskId) && queue.taskIds.length < FOCUS_QUEUE_LIMIT;
}

/** Entra no fim da fila; se não houver foco principal, vira o principal. */
export function addToQueue(queue: QueueState, taskId: string): QueueState {
  if (!canAdd(queue, taskId)) return queue;
  return { taskIds: [...queue.taskIds, taskId], primaryTaskId: queue.primaryTaskId ?? taskId };
}

export function removeFromQueue(queue: QueueState, taskId: string): QueueState {
  return {
    taskIds: queue.taskIds.filter((id) => id !== taskId),
    primaryTaskId: queue.primaryTaskId === taskId ? null : queue.primaryTaskId,
  };
}

/** Só um foco principal (RN-002). */
export function setPrimary(queue: QueueState, taskId: string): QueueState {
  return queue.taskIds.includes(taskId) ? { ...queue, primaryTaskId: taskId } : queue;
}

export function move(queue: QueueState, taskId: string, offset: -1 | 1): QueueState {
  const from = queue.taskIds.indexOf(taskId);
  const to = from + offset;
  if (from < 0 || to < 0 || to >= queue.taskIds.length) return queue;
  const taskIds = [...queue.taskIds];
  [taskIds[from], taskIds[to]] = [taskIds[to] as string, taskIds[from] as string];
  return { ...queue, taskIds };
}
