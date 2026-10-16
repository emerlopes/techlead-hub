import { TRACKING_STALE_DAYS } from "@tlh/shared-contracts";
import { History } from "lucide-react";
import { cn } from "@/lib/utils";

/** Sinaliza acompanhamento desatualizado (§5.4, §14.5). */
export function StaleIndicator({
  lastCheckedDaysAgo,
  thresholdDays = TRACKING_STALE_DAYS,
  className,
}: {
  lastCheckedDaysAgo: number | null;
  thresholdDays?: number;
  className?: string;
}) {
  const never = lastCheckedDaysAgo === null;
  const stale = never || lastCheckedDaysAgo > thresholdDays;
  const text = never
    ? "Nunca verificado"
    : lastCheckedDaysAgo === 0
      ? "Verificado hoje"
      : `Verificado há ${lastCheckedDaysAgo} d`;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 text-2xs",
        stale ? "font-medium text-attention-fg" : "text-subtle-foreground",
        className,
      )}
    >
      <History className="size-3" aria-hidden />
      {text}
      {stale && <span className="sr-only">(desatualizado)</span>}
    </span>
  );
}
