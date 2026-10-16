import type { ContextLoad } from "@tlh/shared-contracts";
import { capacityLevel } from "@/lib/design-system/status";
import { formatHours } from "@/lib/format";
import { cn } from "@/lib/utils";
import { CapacityBar } from "./capacity-bar";
import { StatusBadge } from "./status-badge";

/**
 * Capacidade alocada × demanda de um contexto (time, projeto, sprint) (§25.5). A barra usa só a
 * demanda que vence no período; o restante e os itens sem estimativa aparecem à parte, para que a
 * utilização nunca pareça mais completa do que é (RN-039, §3.4).
 */
export function ContextLoadView({
  load,
  label,
  showBadge = true,
  dueLabel = "vence no período",
  className,
}: {
  load: ContextLoad;
  label?: string;
  showBadge?: boolean;
  /** Na sprint todo o escopo vence no fim dela. */
  dueLabel?: string;
  className?: string;
}) {
  const { demand } = load;
  const notes = [
    demand.laterHours > 0 && `${formatHours(demand.laterHours)} depois do período`,
    demand.undatedHours > 0 && `${formatHours(demand.undatedHours)} sem compromisso`,
  ].filter(Boolean);
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <CapacityBar label={label} demand={demand.dueHours} capacity={load.allocatedHours} />
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-2xs text-muted-foreground">
        {showBadge && <StatusBadge meta={capacityLevel[load.level]} size="sm" />}
        <span className="tabular">
          Demanda que {dueLabel}: <span className="font-medium text-foreground">{formatHours(demand.dueHours)}</span>
        </span>
        {notes.map((note) => (
          <span key={String(note)} className="tabular">
            {note}
          </span>
        ))}
        {demand.unestimatedItems > 0 && (
          <span className="font-medium text-attention-fg">
            {demand.unestimatedItems} {demand.unestimatedItems === 1 ? "item sem estimativa" : "itens sem estimativa"}
          </span>
        )}
      </div>
    </div>
  );
}
