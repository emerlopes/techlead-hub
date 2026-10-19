import type { CapacityOverview, Period } from "@tlh/shared-contracts";
import { Clock, Gauge, Hourglass, TrendingUp, Users } from "lucide-react";
import { Kpi } from "@/components/domain/kpi";
import { formatBusinessRange, formatHours } from "@/lib/format";

/** Totais do período somando pessoas, nunca contextos (RN-037). Visão geral e relatório de capacidade. */
export function CapacityTotals({
  totals,
  period,
  conflicts,
}: {
  totals: CapacityOverview["totals"];
  period: Period;
  /** Pessoas com alguma inconsistência de alocação. */
  conflicts: number;
}) {
  return (
    <section aria-label="Totais do período" className="grid grid-cols-2 gap-3 lg:grid-cols-5">
      <Kpi label="Nominal" value={formatHours(totals.nominalHours)} icon={Clock} hint={formatBusinessRange(period.from, period.to)} />
      <Kpi label="Efetiva" value={formatHours(totals.effectiveHours)} icon={Gauge} tone="capacity" hint={`${formatHours(totals.unavailableHours)} indisponíveis`} />
      <Kpi label="Alocada" value={formatHours(totals.allocatedHours)} icon={Users} tone="capacity" />
      <Kpi label="Livre" value={formatHours(totals.freeHours)} icon={Hourglass} tone={totals.freeHours > 0 ? "attention" : "neutral"} hint="Capacidade não alocada" />
      <Kpi
        label="Sobrecarga"
        value={formatHours(totals.overAllocatedHours)}
        icon={TrendingUp}
        tone={totals.overAllocatedHours > 0 ? "danger" : "neutral"}
        hint={`${conflicts} pessoa(s) com inconsistência`}
      />
    </section>
  );
}
