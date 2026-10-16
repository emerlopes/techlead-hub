import { z } from "zod";

function isValidTimeZone(value: string): boolean {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: value });
    return true;
  } catch {
    return false;
  }
}

export const DEFAULT_TIMEZONE = "America/Sao_Paulo";
export const DEFAULT_LOCALE = "pt-BR";

export const workspaceNameSchema = z
  .string()
  .trim()
  .min(2, "Informe ao menos 2 caracteres.")
  .max(80, "Use no máximo 80 caracteres.");

/** Fuso explícito para calendários (§35.3). */
export const timeZoneSchema = z
  .string()
  .trim()
  .refine(isValidTimeZone, "Fuso horário inválido.");

export const workspaceSchema = z.object({
  id: z.uuid(),
  name: z.string(),
  timezone: z.string(),
  locale: z.string(),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
  version: z.number().int(),
});

export type Workspace = z.infer<typeof workspaceSchema>;

export const updateWorkspaceSchema = z
  .object({
    name: workspaceNameSchema.optional(),
    timezone: timeZoneSchema.optional(),
    /** Controle otimista de concorrência (§35.5). */
    version: z.number().int().nonnegative(),
  })
  .strict();

export type UpdateWorkspaceInput = z.infer<typeof updateWorkspaceSchema>;
