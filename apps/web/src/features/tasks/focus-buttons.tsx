"use client";

import { FOCUS_QUEUE_LIMIT, type Task } from "@tlh/shared-contracts";
import { Star, Target, X } from "lucide-react";
import { FormError } from "@/components/app/form-error";
import { Button } from "@/components/ui/button";
import { apiMutation } from "@/lib/api/client";
import { useApiAction } from "@/lib/api/use-api-action";
import { addToQueue, canAdd, type QueueState, removeFromQueue, setPrimary } from "./focus-queue-ops";

/** Ações de foco a partir do detalhe da atividade (§6.6). */
export function FocusButtons({ task, queue }: { task: Task; queue: QueueState }) {
  const action = useApiAction();
  const save = (next: QueueState) => action.run(() => apiMutation("PUT", "/focus-queue", next));
  const open = task.status !== "DONE" && task.status !== "CANCELLED";
  if (!open) return null;

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap gap-2">
        {task.focus ? (
          <>
            {!task.focus.isPrimary && (
              <Button variant="outline" size="sm" disabled={action.pending} onClick={() => save(setPrimary(queue, task.id))}>
                <Star aria-hidden />
                Tornar foco principal
              </Button>
            )}
            <Button variant="ghost" size="sm" disabled={action.pending} onClick={() => save(removeFromQueue(queue, task.id))}>
              <X aria-hidden />
              Remover do foco
            </Button>
          </>
        ) : (
          <Button
            variant="outline"
            size="sm"
            disabled={action.pending || !canAdd(queue, task.id)}
            onClick={() => save(addToQueue(queue, task.id))}
          >
            <Target aria-hidden />
            Colocar em foco
          </Button>
        )}
      </div>
      {!task.focus && !canAdd(queue, task.id) && (
        <p className="text-xs text-muted-foreground">
          A fila já tem {FOCUS_QUEUE_LIMIT} atividades (RN-003). Remova uma para incluir esta.
        </p>
      )}
      <FormError error={action.error} />
    </div>
  );
}
