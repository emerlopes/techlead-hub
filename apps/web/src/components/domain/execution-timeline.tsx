import Link from "next/link";
import { toneFill } from "@/components/ui/progress";
import { type PlanItemState, planItemState } from "@/lib/design-system/status";
import { formatBusinessDate, formatHours } from "@/lib/format";
import { cn } from "@/lib/utils";
import { StatusBadge } from "./status-badge";

export type TimelineRow = {
  id: string;
  code: string;
  title: string;
  href?: string;
  state: PlanItemState;
  /** Alinhado a `days`. */
  hoursByDay: readonly number[];
};

const dayNumber = (isoDate: string) => isoDate.slice(8, 10);

/**
 * Como a capacidade do contexto é consumida dia a dia pela fila (§22): uma linha por item, uma coluna
 * por dia. A altura da barra é proporcional às horas; dias sem capacidade ficam hachurados. Rola na
 * horizontal dentro do cartão em períodos longos, sem scroll de página.
 */
export function ExecutionTimeline({
  days,
  capacityByDay,
  usedByDay,
  rows,
  className,
}: {
  days: readonly string[];
  capacityByDay: readonly number[];
  usedByDay: readonly number[];
  rows: readonly TimelineRow[];
  className?: string;
}) {
  const scale = Math.max(1, ...capacityByDay, ...usedByDay);
  return (
    <div className={cn("overflow-x-auto", className)}>
      <table className="border-separate border-spacing-0 text-xs">
        <caption className="sr-only">Horas projetadas por item e por dia</caption>
        <thead>
          <tr>
            <th scope="col" className="sticky left-0 z-10 min-w-40 bg-surface pr-2 text-left text-2xs font-medium text-muted-foreground">
              Item
            </th>
            {days.map((day) => (
              <th
                key={day}
                scope="col"
                title={formatBusinessDate(day)}
                className="w-7 min-w-7 pb-1 text-center font-mono text-2xs font-normal text-muted-foreground tabular"
              >
                {dayNumber(day)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id}>
              <th scope="row" className="sticky left-0 z-10 max-w-48 bg-surface py-0.5 pr-2 text-left font-normal">
                <span className="flex min-w-0 items-center gap-1.5">
                  {row.href ? (
                    <Link href={row.href} title={row.title} className="truncate font-mono text-2xs font-medium hover:underline">
                      {row.code}
                    </Link>
                  ) : (
                    <span title={row.title} className="truncate font-mono text-2xs font-medium">
                      {row.code}
                    </span>
                  )}
                  <StatusBadge meta={planItemState[row.state]} size="sm" variant="dot" className="shrink-0" />
                </span>
              </th>
              {days.map((day, index) => {
                const hours = row.hoursByDay[index] ?? 0;
                return (
                  <td
                    key={day}
                    title={hours > 0 ? `${formatHours(hours)} em ${formatBusinessDate(day)}` : undefined}
                    className={cn("h-7 border-l border-border/60 p-0.5 align-bottom", (capacityByDay[index] ?? 0) <= 0 && "bg-hatch")}
                  >
                    {hours > 0 && (
                      <div className="flex h-6 items-end">
                        <div
                          aria-hidden
                          className={cn("w-full rounded-sm", toneFill[planItemState[row.state].tone])}
                          style={{ height: `${Math.max(12, (hours / scale) * 100)}%` }}
                        />
                        <span className="sr-only">{formatHours(hours)}</span>
                      </div>
                    )}
                  </td>
                );
              })}
            </tr>
          ))}
          <tr>
            <th scope="row" className="sticky left-0 z-10 bg-surface pt-1.5 pr-2 text-left text-2xs font-medium text-muted-foreground">
              Uso da capacidade
            </th>
            {days.map((day, index) => {
              const capacity = capacityByDay[index] ?? 0;
              const used = usedByDay[index] ?? 0;
              return (
                <td
                  key={day}
                  title={`${formatHours(used)} de ${formatHours(capacity)} em ${formatBusinessDate(day)}`}
                  className="h-7 border-t border-l border-border/60 p-0.5 pt-1.5 align-bottom"
                >
                  <div className={cn("relative h-5 w-full overflow-hidden rounded-sm bg-secondary", capacity <= 0 && "bg-hatch")}>
                    <div
                      aria-hidden
                      className="absolute inset-x-0 bottom-0 bg-capacity/70"
                      style={{ height: `${capacity > 0 ? Math.min(100, (used / capacity) * 100) : 0}%` }}
                    />
                  </div>
                  <span className="sr-only">
                    {formatHours(used)} de {formatHours(capacity)}
                  </span>
                </td>
              );
            })}
          </tr>
        </tbody>
      </table>
    </div>
  );
}
