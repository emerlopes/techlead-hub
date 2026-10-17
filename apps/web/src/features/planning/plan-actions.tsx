"use client";

import type { ExecutionPlan, ExecutionPlanStatusValue } from "@tlh/shared-contracts";
import { Archive, CirclePlay, FilePen } from "lucide-react";
import { FormError } from "@/components/app/form-error";
import { Button } from "@/components/ui/button";
import { ConfirmButton } from "@/components/ui/confirm-button";
import { apiMutation } from "@/lib/api/client";
import { useApiAction } from "@/lib/api/use-api-action";

/**
 * Situação do plano: ativar (consome a capacidade do contexto), voltar a rascunho, arquivar (com
 * confirmação; a fila deixa de ser projetada) e reabrir um arquivado como rascunho.
 */
export function PlanActions({ plan }: { plan: ExecutionPlan }) {
  const action = useApiAction();
  const go = (status: ExecutionPlanStatusValue) =>
    action.run(() => apiMutation("PATCH", `/execution-plans/${plan.id}`, { status, version: plan.version }));

  return (
    <div className="flex flex-col items-end gap-2">
      <div className="flex flex-wrap justify-end gap-2">
        {plan.status === "DRAFT" && (
          <Button size="sm" disabled={action.pending} onClick={() => go("ACTIVE")}>
            <CirclePlay aria-hidden />
            Ativar
          </Button>
        )}
        {plan.status === "ACTIVE" && (
          <Button size="sm" variant="outline" disabled={action.pending} onClick={() => go("DRAFT")}>
            <FilePen aria-hidden />
            Voltar a rascunho
          </Button>
        )}
        {plan.status === "ARCHIVED" ? (
          <Button size="sm" variant="outline" disabled={action.pending} onClick={() => go("DRAFT")}>
            <FilePen aria-hidden />
            Reabrir como rascunho
          </Button>
        ) : (
          <ConfirmButton question="Arquivar o plano?" confirmLabel="Arquivar" pending={action.pending} onConfirm={() => go("ARCHIVED")}>
            <Archive aria-hidden />
            Arquivar
          </ConfirmButton>
        )}
      </div>
      <FormError error={action.error} />
    </div>
  );
}
