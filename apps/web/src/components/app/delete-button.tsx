"use client";

import { Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { FormError } from "@/components/app/form-error";
import { ConfirmButton } from "@/components/ui/confirm-button";
import { apiMutation } from "@/lib/api/client";
import { useApiAction } from "@/lib/api/use-api-action";

/**
 * Exclusão definitiva (§35.9): pede confirmação, chama `DELETE` e volta para a listagem. Vínculos e
 * históricos dependentes saem junto na API; o evento fica na trilha de auditoria.
 */
export function DeleteButton({
  path,
  redirectTo,
  question,
  onDeleted,
}: {
  /** Recurso na API, ex.: `/projects/<id>`. */
  path: string;
  /** Para onde ir depois de excluir; sem valor, apenas recarrega a página atual. */
  redirectTo?: string;
  question: string;
  onDeleted?: () => void;
}) {
  const router = useRouter();
  const action = useApiAction();

  return (
    <div className="flex flex-col items-end gap-2">
      <ConfirmButton
        question={question}
        confirmLabel="Excluir"
        pending={action.pending}
        onConfirm={() =>
          action.run(async () => {
            await apiMutation("DELETE", path);
            onDeleted?.();
            if (redirectTo) router.push(redirectTo);
          })
        }
      >
        <Trash2 aria-hidden />
        Excluir
      </ConfirmButton>
      <FormError error={action.error} />
    </div>
  );
}
