import { cn } from "@/lib/utils";
import type { Tone } from "@/lib/design-system/status";

const fill: Record<Tone | "primary", string> = {
  primary: "bg-primary",
  neutral: "bg-neutral",
  info: "bg-info",
  success: "bg-success",
  attention: "bg-attention",
  warning: "bg-warning",
  danger: "bg-danger",
  blocked: "bg-blocked",
  personal: "bg-personal",
  delivery: "bg-delivery",
  capacity: "bg-capacity",
};

export function Progress({
  value,
  max = 100,
  tone = "primary",
  label,
  className,
}: {
  value: number;
  max?: number;
  tone?: Tone | "primary";
  label: string;
  className?: string;
}) {
  const pct = Math.max(0, Math.min(100, (value / max) * 100));
  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={max}
      aria-valuenow={value}
      className={cn("h-1.5 w-full overflow-hidden rounded-full bg-secondary", className)}
    >
      <div className={cn("h-full rounded-full transition-[width]", fill[tone])} style={{ width: `${pct}%` }} />
    </div>
  );
}

export { fill as toneFill };
