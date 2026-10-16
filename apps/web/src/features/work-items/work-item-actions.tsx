"use client";

import type { WorkItem } from "@tlh/shared-contracts";
import { CircleCheck, CircleSlash, FileSearch, History, Play, RotateCcw } from "lucide-react";
import { FormError } from "@/components/app/form-error";
import { Button } from "@/components/ui/button";
import { ConfirmButton } from "@/components/ui/confirm-button";
import { apiMutation } from "@/lib/api/client";
import { useApiAction } from "@/lib/api/use-api-action";

/**
 * Execução do item (§13.4) e verificação (§14.2). Concluir zera o esforço restante (RN-035) e não
 * mexe no refinamento (RN-007); encerrar a sprint nunca conclui o item (RN-011).
 */
export function WorkItemActions({ item }: { item: WorkItem }) {
  const action = useApiAction();
  const setStatus = (executionStatus: WorkItem["executionStatus"]) =>
    action.run(() => apiMutation("PATCH", `/work-items/${item.id}`, { executionStatus, version: item.version }));
  const closed = item.executionStatus === "DONE" || item.executionStatus === "CANCELLED";

  return (
    <div className="flex flex-col items-end gap-2">
      <div className="flex flex-wrap justify-end gap-2">
        {!closed && (
          <Button
            variant="outline"
            size="sm"
            disabled={action.pending}
            onClick={() => action.run(() => apiMutation("POST", `/work-items/${item.id}/check`))}
          >
            <History aria-hidden />
            Registrar verificação
          </Button>
        )}
        {closed ? (
          <Button variant="outline" size="sm" disabled={action.pending} onClick={() => setStatus("IN_PROGRESS")}>
            <RotateCcw aria-hidden />
            Reabrir
          </Button>
        ) : (
          <>
            {item.executionStatus === "NOT_STARTED" && (
              <Button variant="outline" size="sm" disabled={action.pending} onClick={() => setStatus("IN_PROGRESS")}>
                <Play aria-hidden />
                Iniciar
              </Button>
            )}
            {item.executionStatus === "IN_PROGRESS" && (
              <Button variant="outline" size="sm" disabled={action.pending} onClick={() => setStatus("IN_REVIEW")}>
                <FileSearch aria-hidden />
                Em revisão
              </Button>
            )}
            <ConfirmButton
              question="Cancelar o item?"
              confirmLabel="Cancelar item"
              pending={action.pending}
              onConfirm={() => setStatus("CANCELLED")}
            >
              <CircleSlash aria-hidden />
              Cancelar
            </ConfirmButton>
            <Button size="sm" disabled={action.pending} onClick={() => setStatus("DONE")}>
              <CircleCheck aria-hidden />
              Concluir
            </Button>
          </>
        )}
      </div>
      <FormError error={action.error} />
    </div>
  );
}
