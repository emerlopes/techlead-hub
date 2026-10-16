"use client";

import type { AvailabilityException } from "@tlh/shared-contracts";
import { CircleSlash } from "lucide-react";
import { FormError } from "@/components/app/form-error";
import { ConfirmButton } from "@/components/ui/confirm-button";
import { apiMutation } from "@/lib/api/client";
import { useApiAction } from "@/lib/api/use-api-action";

/** Cancelar mantém o registro (§35.9); a capacidade volta a contar o período na próxima leitura. */
export function CancelExceptionButton({ exception }: { exception: AvailabilityException }) {
  const action = useApiAction();
  return (
    <span className="inline-flex flex-col items-end gap-1">
      <ConfirmButton
        variant="ghost"
        question="Cancelar o registro?"
        confirmLabel="Cancelar registro"
        pending={action.pending}
        onConfirm={() =>
          action.run(() => apiMutation("POST", `/capacity/availability-exceptions/${exception.id}/cancel`, { version: exception.version }))
        }
      >
        <CircleSlash aria-hidden />
        Cancelar
      </ConfirmButton>
      <FormError error={action.error} />
    </span>
  );
}
