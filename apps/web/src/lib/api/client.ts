import { API_PREFIX, CSRF_HEADER, CSRF_HEADER_VALUE } from "@tlh/shared-contracts";
import { ApiRequestError, readApiError, unreachableError } from "./errors";

type Method = "POST" | "PATCH" | "PUT" | "DELETE";

/**
 * Mutação a partir do navegador. Vai para a mesma origem (`/api/v1`, repassada pelo `proxy.ts`),
 * então o cookie de sessão HttpOnly segue automaticamente; o cabeçalho CSRF é obrigatório (§44.2).
 */
export async function apiMutation<T = void>(method: Method, path: string, body?: unknown): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${API_PREFIX}${path}`, {
      method,
      credentials: "same-origin",
      headers: {
        [CSRF_HEADER]: CSRF_HEADER_VALUE,
        ...(body === undefined ? {} : { "content-type": "application/json" }),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch {
    throw new ApiRequestError(unreachableError);
  }
  if (!response.ok) throw new ApiRequestError(await readApiError(response));
  if (response.status === 204) return undefined as T;
  return (await response.json()) as T;
}
