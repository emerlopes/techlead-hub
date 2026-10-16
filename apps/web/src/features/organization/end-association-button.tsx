"use client";

import { Unlink } from "lucide-react";
import { ConfirmButton } from "@/components/ui/confirm-button";
import { apiMutation } from "@/lib/api/client";
import { useApiAction } from "@/lib/api/use-api-action";

/** Encerra a participação; o período continua no histórico (RN-025). */
export function EndAssociationButton({ endpoint, label }: { endpoint: string; label: string }) {
  const action = useApiAction();
  return (
    <span className="inline-flex flex-col items-end gap-1">
      <ConfirmButton
        variant="ghost"
        question="Encerrar participação?"
        confirmLabel="Encerrar"
        pending={action.pending}
        onConfirm={() => action.run(() => apiMutation("POST", endpoint))}
        aria-label={label}
      >
        <Unlink aria-hidden />
        <span className="max-sm:sr-only">Encerrar</span>
      </ConfirmButton>
      {action.error && <span className="text-xs text-danger-fg" role="alert">{action.error.message}</span>}
    </span>
  );
}
