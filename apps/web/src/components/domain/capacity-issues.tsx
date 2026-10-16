import type { CapacityIssue } from "@tlh/shared-contracts";
import { capacityIssueType } from "@/lib/design-system/status";
import { cn } from "@/lib/utils";
import { StatusBadge } from "./status-badge";

/** Inconsistências de alocação sinalizadas antes da previsão (§20.5). Sem inconsistência, nada. */
export function CapacityIssues({
  issues,
  withDescription = false,
  className,
}: {
  issues: readonly CapacityIssue[];
  withDescription?: boolean;
  className?: string;
}) {
  if (issues.length === 0) return null;
  if (!withDescription) {
    return (
      <span className={cn("inline-flex flex-wrap gap-1", className)}>
        {issues.map((issue) => (
          <StatusBadge key={issue.type} meta={capacityIssueType[issue.type]} size="sm" />
        ))}
      </span>
    );
  }
  return (
    <ul className={cn("flex flex-col gap-2", className)}>
      {issues.map((issue) => (
        <li key={issue.type} className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          <StatusBadge meta={capacityIssueType[issue.type]} size="sm" />
          {capacityIssueType[issue.type].description}
        </li>
      ))}
    </ul>
  );
}
