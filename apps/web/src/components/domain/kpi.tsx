import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Tone } from "@/lib/design-system/status";

const iconTone: Partial<Record<Tone, string>> = {
  neutral: "bg-neutral-subtle text-neutral-fg",
  success: "bg-success-subtle text-success-fg",
  attention: "bg-attention-subtle text-attention-fg",
  warning: "bg-warning-subtle text-warning-fg",
  danger: "bg-danger-subtle text-danger-fg",
  blocked: "bg-blocked-subtle text-blocked-fg",
  personal: "bg-personal-subtle text-personal-fg",
  delivery: "bg-delivery-subtle text-delivery-fg",
  capacity: "bg-capacity-subtle text-capacity-fg",
  info: "bg-info-subtle text-info-fg",
};

/** Indicador numérico do dashboard. `value = null` → "—" (nunca 0 inventado). */
export function Kpi({
  label,
  value,
  unit,
  hint,
  icon: Icon,
  tone = "neutral",
  className,
}: {
  label: string;
  value: number | string | null;
  unit?: string;
  hint?: React.ReactNode;
  icon?: LucideIcon;
  tone?: Tone;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col gap-2 rounded-lg border border-border bg-surface p-4 shadow-xs", className)}>
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-medium text-muted-foreground">{label}</span>
        {Icon && (
          <span className={cn("flex size-6 items-center justify-center rounded-md", iconTone[tone])}>
            <Icon className="size-3.5" aria-hidden />
          </span>
        )}
      </div>
      <div className="flex items-baseline gap-1">
        <span className="text-2xl font-semibold tracking-tight tabular">{value ?? "—"}</span>
        {unit && value !== null && <span className="text-sm text-muted-foreground">{unit}</span>}
      </div>
      {hint && <div className="text-xs text-muted-foreground">{hint}</div>}
    </div>
  );
}
