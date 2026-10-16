"use client";

import type { ApiError } from "@tlh/shared-contracts";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toApiError } from "./errors";

/**
 * Ações pontuais sem formulário (mudar situação, encerrar associação, reordenar a fila): executa,
 * expõe o erro no contrato `ApiError` e recarrega os dados do servidor ao concluir.
 */
export function useApiAction() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<ApiError | null>(null);

  function run(action: () => Promise<unknown>) {
    startTransition(async () => {
      setError(null);
      try {
        await action();
        router.refresh();
      } catch (err) {
        setError(toApiError(err));
      }
    });
  }

  return { run, pending, error, setError };
}
