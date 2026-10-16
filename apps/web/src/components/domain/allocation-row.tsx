import type { Allocation } from "@tlh/shared-contracts";
import { Layers } from "lucide-react";
import Link from "next/link";
import { formatAllocationValue, formatBusinessDate, formatHours } from "@/lib/format";
import { cn } from "@/lib/utils";
import { ContextChip } from "./domain-tag";

/**
 * Alocação em uma linha (§20): destino (time, projeto ou reserva geral), valor, vigência e, quando
 * calculadas, as horas no período. Alocação não é esforço realizado (RN-036).
 */
export function AllocationRow({
  allocation,
  hours,
  showDeveloper = true,
  className,
}: {
  allocation: Allocation;
  /** Horas da alocação no período consultado. */
  hours?: number;
  showDeveloper?: boolean;
  className?: string;
}) {
  const reserve = !allocation.team && !allocation.project;
  return (
    <div className={cn("flex flex-wrap items-center gap-x-3 gap-y-1.5", !allocation.active && "text-muted-foreground", className)}>
      <Link href={`/capacity/allocations/${allocation.id}`} className="inline-flex min-w-0 items-center gap-1.5 text-sm font-medium hover:underline">
        {showDeveloper ? allocation.developer.name : reserve ? "Reserva geral" : allocation.project?.name ?? allocation.team?.name}
      </Link>
      <span className="inline-flex items-center gap-1">
        {allocation.team && <ContextChip code={allocation.team.code} name={allocation.team.name} />}
        {allocation.project && <ContextChip code={allocation.project.code} name={allocation.project.name} />}
        {reserve && (
          <span className="inline-flex items-center gap-1 text-2xs text-muted-foreground">
            <Layers className="size-3" aria-hidden />
            {allocation.description}
          </span>
        )}
      </span>
      <span className="font-mono text-xs tabular">{formatAllocationValue(allocation)}</span>
      <span className="text-2xs text-muted-foreground tabular">
        {formatBusinessDate(allocation.validFrom)} → {allocation.validUntil ? formatBusinessDate(allocation.validUntil) : "sem fim"}
      </span>
      {hours !== undefined && <span className="ml-auto font-mono text-xs tabular">{formatHours(hours)}</span>}
    </div>
  );
}
