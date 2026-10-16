import { z } from "zod";

/** Controle otimista de concorrência (§35.5): toda alteração informa a versão lida. */
export const versionSchema = z.number().int().positive();

/** Código curto de time/projeto (§7.4, §8.5): maiúsculas, único por workspace (RN-015). */
export const contextCodeSchema = z
  .string()
  .trim()
  .toUpperCase()
  .regex(/^[A-Z0-9][A-Z0-9_-]{1,11}$/, "Use de 2 a 12 letras, números, _ ou -, começando por letra ou número.");

export const nameSchema = z
  .string()
  .trim()
  .min(2, "Informe ao menos 2 caracteres.")
  .max(80, "Use no máximo 80 caracteres.");

/** Texto opcional: vazio vira `null` (limpa o campo); ausente não altera. */
export function optionalText(max: number) {
  return z
    .union([z.string().trim().max(max, `Use no máximo ${max} caracteres.`), z.null()])
    .transform((value) => (value === "" ? null : value))
    .optional();
}

/** Data de negócio `YYYY-MM-DD` (§35.3); vazia vira `null`. */
export const optionalIsoDate = z
  .union([z.literal(""), z.iso.date("Informe uma data válida."), z.null()])
  .transform((value) => (value === "" ? null : value))
  .optional();

/** Horas com precisão decimal (§35.4). */
export const optionalHours = z
  .number({ error: "Informe um número válido." })
  .min(0, "Não pode ser negativo.")
  .max(9999, "Use no máximo 9999 horas.")
  .nullable()
  .optional();

export const uuidListSchema = z
  .array(z.uuid())
  .max(20, "Selecione no máximo 20.")
  .refine((ids) => new Set(ids).size === ids.length, "Itens repetidos.");

/** Referência compacta a um contexto (time ou projeto) exibida em chips. */
export const contextRefSchema = z.object({
  id: z.uuid(),
  code: z.string(),
  name: z.string(),
});

export type ContextRef = z.infer<typeof contextRefSchema>;

/* -------------------------------------------------------------------------- */
/* Paginação (RNF-009)                                                        */
/* -------------------------------------------------------------------------- */

export const PAGE_SIZE_DEFAULT = 50;
export const PAGE_SIZE_MAX = 100;

export const paginationQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(PAGE_SIZE_MAX).default(PAGE_SIZE_DEFAULT),
});

export function paginatedSchema<T extends z.ZodType>(item: T) {
  return z.object({
    items: z.array(item),
    total: z.number().int(),
    page: z.number().int(),
    pageSize: z.number().int(),
  });
}

export type Paginated<T> = { items: T[]; total: number; page: number; pageSize: number };

/** Recorta uma página de uma lista já filtrada e ordenada. */
export function paginate<T>(rows: readonly T[], page: number, pageSize: number): Paginated<T> {
  const start = (page - 1) * pageSize;
  return { items: rows.slice(start, start + pageSize), total: rows.length, page, pageSize };
}

/* -------------------------------------------------------------------------- */
/* Histórico (RNF-004)                                                        */
/* -------------------------------------------------------------------------- */

/** Evento de auditoria de uma entidade: nomes de campos e transições, nunca valores pessoais (§44.5). */
export const historyEntrySchema = z.object({
  id: z.uuid(),
  action: z.string(),
  occurredAt: z.iso.datetime(),
  fields: z.array(z.string()),
  fromStatus: z.string().nullable(),
  toStatus: z.string().nullable(),
});
export type HistoryEntry = z.infer<typeof historyEntrySchema>;

/** Referências compactas usadas em vínculos. */
export const workItemRefSchema = z.object({ id: z.uuid(), externalKey: z.string(), title: z.string() });
export type WorkItemRef = z.infer<typeof workItemRefSchema>;

/** Pessoa, sprint ou release referenciada pelo nome. */
export const namedRefSchema = z.object({ id: z.uuid(), name: z.string() });
export type NamedRef = z.infer<typeof namedRefSchema>;

/** Filtro `?stale=true` e similares vindos da query string. */
export const queryFlag = z.stringbool().optional();
