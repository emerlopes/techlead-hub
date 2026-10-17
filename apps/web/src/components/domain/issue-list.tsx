import type { StatusMeta } from "@/lib/design-system/status";
import { cn } from "@/lib/utils";
import { StatusBadge } from "./status-badge";

/**
 * Sinalizações de um catálogo do `status.ts` (conflitos de alocação, restrições do plano…): só os
 * selos ou, com `withDescription`, cada selo com a explicação. Sem sinalização, nada.
 */
export function IssueList<T extends string>({
  issues,
  catalog,
  withDescription = false,
  className,
}: {
  issues: readonly { type: T }[];
  catalog: Record<T, StatusMeta>;
  withDescription?: boolean;
  className?: string;
}) {
  if (issues.length === 0) return null;
  if (!withDescription) {
    return (
      <span className={cn("inline-flex flex-wrap gap-1", className)}>
        {issues.map((issue) => (
          <StatusBadge key={issue.type} meta={catalog[issue.type]} size="sm" />
        ))}
      </span>
    );
  }
  return (
    <ul className={cn("flex flex-col gap-2", className)}>
      {issues.map((issue) => (
        <li key={issue.type} className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          <StatusBadge meta={catalog[issue.type]} size="sm" />
          {catalog[issue.type].description}
        </li>
      ))}
    </ul>
  );
}
