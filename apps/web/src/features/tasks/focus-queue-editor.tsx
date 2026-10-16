"use client";

import type { FocusQueue } from "@tlh/shared-contracts";
import { ArrowDown, ArrowUp, Star, X } from "lucide-react";
import { FormError } from "@/components/app/form-error";
import { TaskItem } from "@/components/domain/task-item";
import { Button } from "@/components/ui/button";
import { apiMutation } from "@/lib/api/client";
import { useApiAction } from "@/lib/api/use-api-action";
import { move, type QueueState, removeFromQueue, setPrimary, toQueueState } from "./focus-queue-ops";

/** Reordena a fila, troca o foco principal e remove itens (§6.6). Os alertas de prazo seguem visíveis. */
export function FocusQueueEditor({ queue }: { queue: FocusQueue }) {
  const action = useApiAction();
  const state = toQueueState(queue);
  const save = (next: QueueState) => action.run(() => apiMutation("PUT", "/focus-queue", next));
  const last = queue.items.length - 1;

  return (
    <div className="flex flex-col gap-2" aria-busy={action.pending}>
      <FormError error={action.error} />
      <ol className="flex flex-col divide-y divide-border">
        {queue.items.map((item, index) => (
          <li key={item.task.id} className="flex flex-wrap items-start gap-2 py-2.5">
            <span className="mt-0.5 w-5 shrink-0 font-mono text-xs text-muted-foreground tabular">{index + 1}.</span>
            <TaskItem task={item.task} className="min-w-48 flex-1" />
            <div className="flex shrink-0 items-center gap-0.5">
              <Button
                variant={item.isPrimary ? "secondary" : "ghost"}
                size="icon-sm"
                aria-label={item.isPrimary ? "Foco principal" : "Tornar foco principal"}
                aria-pressed={item.isPrimary}
                title={item.isPrimary ? "Foco principal" : "Tornar foco principal"}
                disabled={action.pending || item.isPrimary}
                onClick={() => save(setPrimary(state, item.task.id))}
              >
                <Star className={item.isPrimary ? "fill-personal text-personal" : undefined} aria-hidden />
              </Button>
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label="Subir na fila"
                disabled={action.pending || index === 0}
                onClick={() => save(move(state, item.task.id, -1))}
              >
                <ArrowUp aria-hidden />
              </Button>
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label="Descer na fila"
                disabled={action.pending || index === last}
                onClick={() => save(move(state, item.task.id, 1))}
              >
                <ArrowDown aria-hidden />
              </Button>
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label="Remover do foco"
                disabled={action.pending}
                onClick={() => save(removeFromQueue(state, item.task.id))}
              >
                <X aria-hidden />
              </Button>
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}
