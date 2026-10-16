"use client";

import type { ApiError } from "@tlh/shared-contracts";
import { type FormEvent, useState, useTransition } from "react";
import type { z } from "zod";
import { toApiError } from "./errors";

/**
 * Estado comum dos formulários que falam com a API: valida no navegador com o mesmo schema
 * da API (contrato compartilhado), envia, e expõe erro geral e erros por campo.
 */
export function useApiForm<S extends z.ZodType, R>({
  schema,
  read,
  submit,
  onSuccess,
}: {
  schema: S;
  read: (form: FormData) => unknown;
  submit: (data: z.output<S>) => Promise<R>;
  onSuccess: (result: R) => void;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<ApiError | null>(null);

  const fieldErrors: Record<string, string> = {};
  for (const detail of error?.details ?? []) fieldErrors[detail.path] ??= detail.message;

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const parsed = schema.safeParse(read(new FormData(event.currentTarget)));
    if (!parsed.success) {
      setError({
        statusCode: 400,
        code: "VALIDATION_FAILED",
        message: "Revise os campos destacados.",
        details: parsed.error.issues.map((i) => ({ path: i.path.join("."), message: i.message })),
      });
      return;
    }
    startTransition(async () => {
      setError(null);
      try {
        onSuccess(await submit(parsed.data));
      } catch (err) {
        setError(toApiError(err));
      }
    });
  }

  return { onSubmit, pending, error, fieldErrors, setError };
}
