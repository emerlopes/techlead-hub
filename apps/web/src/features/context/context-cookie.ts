import { z } from "zod";

/** Filtro global de contexto (§5.3): permanece durante a navegação até ser alterado. */
export const CONTEXT_COOKIE = "tlh_context";

const contextSchema = z.object({ teamId: z.uuid().optional(), projectId: z.uuid().optional() });
export type SelectedContext = z.infer<typeof contextSchema>;

export function parseContextCookie(value: string | undefined): SelectedContext {
  if (!value) return {};
  try {
    const parsed = contextSchema.safeParse(JSON.parse(value));
    return parsed.success ? parsed.data : {};
  } catch {
    return {};
  }
}
