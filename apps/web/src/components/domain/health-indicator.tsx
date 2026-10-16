import type { Tracking } from "@tlh/shared-contracts";
import { Calculator, Hand } from "lucide-react";
import { healthStatus } from "@/lib/design-system/status";
import { cn } from "@/lib/utils";
import { StatusBadge } from "./status-badge";

/**
 * Saúde de uma entrega: avaliação manual × calculada, armazenadas separadamente (§14.4). A manual
 * prevalece na exibição, mas a calculada continua visível quando diverge (§3.5). Encerrada → nada.
 */
export function HealthIndicator({
  tracking,
  size = "sm",
  showSource = true,
  className,
}: {
  tracking: Pick<Tracking, "health" | "manualHealth" | "calculatedHealth">;
  size?: "sm" | "md";
  showSource?: boolean;
  className?: string;
}) {
  const { health, manualHealth, calculatedHealth } = tracking;
  if (!health) return null;
  const manual = manualHealth !== null;
  const diverges = manual && calculatedHealth !== null && calculatedHealth !== manualHealth;
  const SourceIcon = manual ? Hand : Calculator;
  return (
    <span className={cn("inline-flex flex-wrap items-center gap-1", className)}>
      <StatusBadge meta={healthStatus[health]} size={size} />
      {showSource && (
        <SourceIcon
          className="size-3 text-subtle-foreground"
          aria-label={manual ? "Avaliação manual" : "Saúde calculada"}
        />
      )}
      {diverges && (
        <span className="text-2xs text-muted-foreground">
          calculada: <span className="font-medium">{healthStatus[calculatedHealth].label}</span>
        </span>
      )}
    </span>
  );
}
