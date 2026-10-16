import { Prisma } from "../generated/prisma/client";
import { ApiException } from "./api-exception";

/** Violação de unicidade (inclui os índices únicos parciais criados nas migrations). */
export function isUniqueViolation(error: unknown): boolean {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002";
}

/** Controle otimista (§35.5): versão divergente devolve 409 em vez de sobrescrever. */
export function versionConflict(entity: string): ApiException {
  return new ApiException(
    409,
    "CONFLICT",
    `${entity} foi alterado(a) em outra sessão. Recarregue e tente novamente.`,
  );
}

export function notFound(entity: string): ApiException {
  return new ApiException(404, "NOT_FOUND", `${entity} não encontrado(a).`);
}

export function duplicateCode(code: string): ApiException {
  return new ApiException(409, "CONFLICT", `O código ${code} já está em uso neste workspace (RN-015).`, {
    details: [{ path: "code", message: "Código já utilizado (RN-015)." }],
  });
}

export function ruleViolation(message: string, path?: string): ApiException {
  return new ApiException(422, "RULE_VIOLATION", message, path ? { details: [{ path, message }] } : {});
}

/** Lista de campos alterados para a auditoria — nunca os valores (§44.5). */
export function changedFields(input: Record<string, unknown>): string[] {
  return Object.keys(input).filter((key) => key !== "version" && input[key] !== undefined);
}

export function toIsoOrNull(date: Date | null): string | null {
  return date ? date.toISOString() : null;
}

/** `date` do PostgreSQL (§35.3) ↔ `YYYY-MM-DD`, sem conversão de fuso. */
export function toIsoDate(date: Date | null): string | null {
  return date ? date.toISOString().slice(0, 10) : null;
}

export function fromIsoDate(value: string | null | undefined): Date | null | undefined {
  if (value === undefined) return undefined;
  return value === null ? null : new Date(`${value}T00:00:00Z`);
}

export function toNumberOrNull(value: Prisma.Decimal | null): number | null {
  return value === null ? null : value.toNumber();
}

/**
 * Após um `updateMany` condicionado à versão: nenhuma linha afetada significa que a entidade não
 * existe no workspace (404) ou que a versão lida ficou para trás (409).
 */
export async function assertVersionedUpdate(
  count: number,
  exists: () => Promise<unknown>,
  entity: string,
): Promise<void> {
  if (count > 0) return;
  if (!(await exists())) throw notFound(entity);
  throw versionConflict(entity);
}
