import { cn } from "@/lib/utils";
import { confidence, type Confidence } from "@/lib/design-system/status";

const level: Record<Confidence, number> = { LOW: 1, MEDIUM: 2, HIGH: 3 };
const color: Record<Confidence, string> = {
  LOW: "bg-warning",
  MEDIUM: "bg-attention",
  HIGH: "bg-success",
};

/** Confiança de estimativa/previsão em 3 barras + rótulo. `null` = sem dados. */
export function ConfidenceMeter({
  value,
  showLabel = true,
  className,
}: {
  value: Confidence | null;
  showLabel?: boolean;
  className?: string;
}) {
  const n = value ? level[value] : 0;
  const label = value ? `Confiança ${confidence[value].label.toLowerCase()}` : "Confiança desconhecida";
  return (
    <span className={cn("inline-flex items-center gap-1.5 text-xs text-muted-foreground", className)} title={label}>
      <span className="inline-flex items-end gap-0.5" aria-hidden>
        {[1, 2, 3].map((i) => (
          <span
            key={i}
            className={cn(
              "w-1 rounded-[1px]",
              i === 1 ? "h-1.5" : i === 2 ? "h-2.5" : "h-3.5",
              value && i <= n ? color[value] : "bg-border-strong",
            )}
          />
        ))}
      </span>
      {showLabel ? <span>{label}</span> : <span className="sr-only">{label}</span>}
    </span>
  );
}
