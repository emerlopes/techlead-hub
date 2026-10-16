import type { AvailabilityException } from "@tlh/shared-contracts";
import Link from "next/link";
import { availabilityExceptionType } from "@/lib/design-system/status";
import { formatBusinessRange, formatHours } from "@/lib/format";
import { cn } from "@/lib/utils";
import { StatusBadge } from "./status-badge";

/**
 * Ausência ou feriado em uma linha (§19.2): tipo, pessoa (ou o workspace inteiro), período e quanto
 * do dia fica indisponível. O motivo é genérico (§19.4).
 */
export function AbsenceItem({
  absence,
  showDeveloper = true,
  action,
  className,
}: {
  absence: AvailabilityException;
  showDeveloper?: boolean;
  action?: React.ReactNode;
  className?: string;
}) {
  const cancelled = absence.cancelledAt !== null;
  return (
    <div className={cn("flex flex-wrap items-center gap-x-3 gap-y-1.5", cancelled && "opacity-60", className)}>
      <StatusBadge meta={availabilityExceptionType[absence.type]} size="sm" />
      {showDeveloper &&
        (absence.developer ? (
          <Link href={`/developers/${absence.developer.id}`} className="text-sm font-medium hover:underline">
            {absence.developer.name}
          </Link>
        ) : (
          <span className="text-sm font-medium">Todas as pessoas</span>
        ))}
      <span className="text-xs text-muted-foreground tabular">{formatBusinessRange(absence.startDate, absence.endDate)}</span>
      <span className="text-2xs text-muted-foreground tabular">
        {absence.unavailableHours === null ? "dia inteiro" : `${formatHours(absence.unavailableHours)}/dia`}
      </span>
      {absence.description && <span className="min-w-0 text-xs break-words text-muted-foreground">· {absence.description}</span>}
      {cancelled && <span className="text-2xs font-medium text-muted-foreground uppercase">Cancelada</span>}
      {action && <span className="ml-auto">{action}</span>}
    </div>
  );
}
