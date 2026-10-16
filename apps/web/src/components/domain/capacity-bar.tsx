import { UTILIZATION_ATTENTION_PERCENT } from "@tlh/shared-contracts";
import { cn } from "@/lib/utils";

const h = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 1 });

/**
 * Demanda × capacidade alocada (U = D / CA × 100, §25.5).
 * Faixas: < 85% saudável · 85–100% atenção · > 100% sobrecarga.
 * CA = 0 não vira percentual: exibe "Sem capacidade".
 */
export function CapacityBar({
  demand,
  capacity,
  label,
  className,
}: {
  demand: number;
  capacity: number;
  label?: string;
  className?: string;
}) {
  const noCapacity = capacity <= 0;
  const u = noCapacity ? 0 : (demand / capacity) * 100;
  const tone = noCapacity ? "neutral" : u > 100 ? "danger" : u >= UTILIZATION_ATTENTION_PERCENT ? "attention" : "capacity";
  const fillW = noCapacity ? 0 : Math.min(u, 100);
  const overW = u > 100 ? Math.min(u - 100, 50) : 0;

  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <div className="flex items-baseline justify-between gap-2 text-xs">
        {label && <span className="truncate font-medium">{label}</span>}
        <span className="ml-auto tabular text-muted-foreground">
          {h.format(demand)}h / {h.format(capacity)}h
          <span
            className={cn(
              "ml-1.5 font-semibold",
              tone === "danger" && "text-danger-fg",
              tone === "attention" && "text-attention-fg",
              tone === "capacity" && "text-foreground",
            )}
          >
            {noCapacity ? "Sem capacidade" : `${Math.round(u)}%`}
          </span>
        </span>
      </div>
      <div
        role="meter"
        aria-label={label ?? "Utilização"}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(u)}
        className={cn("relative flex h-2 w-full rounded-full bg-secondary", noCapacity && "bg-hatch")}
      >
        <div
          className={cn(
            "h-full rounded-l-full",
            fillW >= 100 && overW === 0 && "rounded-r-full",
            tone === "danger" ? "bg-danger" : tone === "attention" ? "bg-attention" : "bg-capacity",
          )}
          style={{ width: `${(fillW / (100 + overW)) * 100}%` }}
        />
        {overW > 0 && (
          <div
            className="h-full rounded-r-full bg-danger/40 bg-[repeating-linear-gradient(135deg,transparent_0_3px,var(--danger)_3px_5px)]"
            style={{ width: `${(overW / (100 + overW)) * 100}%` }}
          />
        )}
        {overW > 0 && (
          <span
            aria-hidden
            className="absolute -top-0.5 -bottom-0.5 w-px bg-foreground"
            style={{ left: `${(100 / (100 + overW)) * 100}%` }}
          />
        )}
      </div>
    </div>
  );
}
