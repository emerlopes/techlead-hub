"use client";

import { Undo2 } from "lucide-react";
import { FormError } from "@/components/app/form-error";
import { ConfirmButton } from "@/components/ui/confirm-button";
import { apiMutation } from "@/lib/api/client";
import { useApiAction } from "@/lib/api/use-api-action";

/** Retira o item do escopo de uma sprint ou release; a participação fica no histórico (RN-010, §12.4). */
export function RemoveFromScopeButton({ path, label }: { path: string; label: string }) {
  const action = useApiAction();
  return (
    <span className="flex flex-col items-end gap-1">
      <ConfirmButton
        variant="ghost"
        size="sm"
        aria-label={label}
        question="Retirar do escopo?"
        confirmLabel="Retirar"
        pending={action.pending}
        onConfirm={() => action.run(() => apiMutation("POST", path))}
      >
        <Undo2 aria-hidden />
        Retirar
      </ConfirmButton>
      <FormError error={action.error} />
    </span>
  );
}
