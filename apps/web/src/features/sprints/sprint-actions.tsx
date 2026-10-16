"use client";

import type { Sprint } from "@tlh/shared-contracts";
import { CircleSlash, Lock, Play } from "lucide-react";
import { FormError } from "@/components/app/form-error";
import { Button } from "@/components/ui/button";
import { ConfirmButton } from "@/components/ui/confirm-button";
import { apiMutation } from "@/lib/api/client";
import { useApiAction } from "@/lib/api/use-api-action";

/** Iniciar, cancelar e encerrar (§11.2). Encerrar não conclui histórias (RN-011, CA-009). */
export function SprintActions({ sprint }: { sprint: Sprint }) {
  const action = useApiAction();
  if (sprint.status === "CLOSED" || sprint.status === "CANCELLED") return null;
  const patch = (status: string) => action.run(() => apiMutation("PATCH", `/sprints/${sprint.id}`, { status, version: sprint.version }));

  return (
    <div className="flex flex-col items-end gap-2">
      <div className="flex flex-wrap justify-end gap-2">
        <ConfirmButton
          question="Cancelar a sprint? O escopo fica no histórico."
          confirmLabel="Cancelar sprint"
          pending={action.pending}
          onConfirm={() => patch("CANCELLED")}
        >
          <CircleSlash aria-hidden />
          Cancelar
        </ConfirmButton>
        {sprint.status === "PLANNED" ? (
          <Button size="sm" disabled={action.pending} onClick={() => patch("ACTIVE")}>
            <Play aria-hidden />
            Iniciar sprint
          </Button>
        ) : (
          <ConfirmButton
            variant="primary"
            question="Encerrar? Pendentes continuam abertos para outra sprint."
            confirmLabel="Encerrar sprint"
            pending={action.pending}
            onConfirm={() => action.run(() => apiMutation("POST", `/sprints/${sprint.id}/close`, { version: sprint.version }))}
          >
            <Lock aria-hidden />
            Encerrar sprint
          </ConfirmButton>
        )}
      </div>
      <FormError error={action.error} />
    </div>
  );
}
