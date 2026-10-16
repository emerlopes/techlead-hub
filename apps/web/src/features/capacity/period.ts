import { capacityRangeQuerySchema } from "@tlh/shared-contracts";
import { flatParams } from "@/lib/search-params";

/**
 * `?from&to` de uma página de capacidade. Período inválido é ignorado e a API devolve o padrão
 * (hoje + 2 semanas); a página mostra o período efetivamente usado.
 */
export function readPeriodParams(params: Record<string, string | string[] | undefined>): {
  from?: string;
  to?: string;
  invalid: boolean;
} {
  const flat = flatParams(params);
  const parsed = capacityRangeQuerySchema.safeParse({ from: flat.from || undefined, to: flat.to || undefined });
  if (!parsed.success) return { invalid: true };
  return { from: parsed.data.from, to: parsed.data.to, invalid: false };
}
