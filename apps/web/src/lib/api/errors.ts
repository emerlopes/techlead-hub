import { apiErrorSchema, type ApiError } from "@tlh/shared-contracts";

export class ApiRequestError extends Error {
  constructor(readonly error: ApiError) {
    super(error.message);
    this.name = "ApiRequestError";
  }
}

export const unreachableError: ApiError = {
  statusCode: 503,
  code: "INTERNAL_ERROR",
  message: "Não foi possível conectar à API. Verifique se ela está em execução.",
};

/** Lê o corpo de erro no contrato `ApiError`; respostas fora do contrato viram erro genérico. */
export async function readApiError(response: Response): Promise<ApiError> {
  const parsed = apiErrorSchema.safeParse(await response.json().catch(() => null));
  if (parsed.success) return parsed.data;
  return {
    statusCode: response.status,
    code: "INTERNAL_ERROR",
    message: `A API respondeu com erro inesperado (${response.status}).`,
  };
}

export function toApiError(error: unknown): ApiError {
  if (error instanceof ApiRequestError) return error.error;
  return unreachableError;
}
