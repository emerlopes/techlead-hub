import type { CapacityIssue } from "@tlh/shared-contracts";
import { capacityIssueType } from "@/lib/design-system/status";
import { IssueList } from "./issue-list";

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
  return <IssueList issues={issues} catalog={capacityIssueType} withDescription={withDescription} className={className} />;
}
