"use client";

import type { Allocation } from "@tlh/shared-contracts";
import { CalendarCheck, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { FormError } from "@/components/app/form-error";
import { ConfirmButton } from "@/components/ui/confirm-button";
import { apiMutation } from "@/lib/api/client";
import { useApiAction } from "@/lib/api/use-api-action";

/**
 * Encerrar hoje preserva o histórico (§20.5). Excluir só existe para alocação que ainda não começou
 * — nada do histórico depende dela (§35.9).
 */
export function AllocationActions({ allocation, today }: { allocation: Allocation; today: string }) {
  const router = useRouter();
  const action = useApiAction();
  const future = allocation.validFrom > today;
  const ended = allocation.validUntil !== null && allocation.validUntil < today;

  return (
    <div className="flex flex-col items-end gap-2">
      <div className="flex flex-wrap justify-end gap-2">
        {!future && !ended && allocation.validUntil !== today && (
          <ConfirmButton
            question="Encerrar a alocação hoje?"
            confirmLabel="Encerrar"
            pending={action.pending}
            onConfirm={() =>
              action.run(() => apiMutation("PATCH", `/capacity/allocations/${allocation.id}`, { validUntil: today, version: allocation.version }))
            }
          >
            <CalendarCheck aria-hidden />
            Encerrar hoje
          </ConfirmButton>
        )}
        {future && (
          <ConfirmButton
            question="Excluir a alocação futura?"
            confirmLabel="Excluir"
            pending={action.pending}
            onConfirm={() =>
              action.run(async () => {
                await apiMutation("DELETE", `/capacity/allocations/${allocation.id}`);
                router.push("/capacity/allocations");
              })
            }
          >
            <Trash2 aria-hidden />
            Excluir
          </ConfirmButton>
        )}
      </div>
      <FormError error={action.error} />
    </div>
  );
}
