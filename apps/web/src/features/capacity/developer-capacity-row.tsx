import type { DeveloperCapacity } from "@tlh/shared-contracts";
import Link from "next/link";
import { CapacityBar } from "@/components/domain/capacity-bar";
import { CapacityIssues } from "@/components/domain/capacity-issues";
import { ContextChip } from "@/components/domain/domain-tag";
import { StatusBadge } from "@/components/domain/status-badge";
import { Avatar } from "@/components/ui/misc";
import { capacityIssueType, developerStatus } from "@/lib/design-system/status";
import { formatHours } from "@/lib/format";

/**
 * Capacidade global de uma pessoa no período: alocado × capacidade efetiva. Sem jornada a
 * capacidade é desconhecida, não zero (§3.4). Indicador de planejamento, não de desempenho (§10.4).
 */
export function DeveloperCapacityRow({ capacity }: { capacity: DeveloperCapacity }) {
  const { developer, summary, teams, issues } = capacity;
  const noSchedule = summary.scheduledDays === 0;
  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-2">
        <Avatar name={developer.name} size="sm" />
        <Link href={`/developers/${developer.id}`} className="text-sm font-medium hover:underline">
          {developer.name}
        </Link>
        {developer.status === "INACTIVE" && <StatusBadge meta={developerStatus.INACTIVE} size="sm" />}
        {teams.map((t) => (
          <ContextChip key={t.id} code={t.code} name={t.name} />
        ))}
        <CapacityIssues issues={issues.filter((i) => !(noSchedule && i.type === "NO_SCHEDULE"))} className="ml-auto" />
      </div>
      {noSchedule ? (
        <p className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          <StatusBadge meta={capacityIssueType.NO_SCHEDULE} size="sm" />
          Cadastre a jornada para calcular a capacidade.
        </p>
      ) : (
        <>
          <CapacityBar label="Alocado × capacidade efetiva" demand={summary.allocatedHours} capacity={summary.effectiveHours} />
          <p className="flex flex-wrap gap-x-3 gap-y-1 text-2xs text-muted-foreground tabular">
            <span>Nominal {formatHours(summary.nominalHours)}</span>
            <span>Indisponível {formatHours(summary.unavailableHours)}</span>
            <span>Livre {formatHours(summary.freeHours)}</span>
            {summary.overAllocatedHours > 0 && (
              <span className="font-medium text-danger-fg">Excedente {formatHours(summary.overAllocatedHours)}</span>
            )}
            {summary.scheduledDays < summary.days && <span>{summary.days - summary.scheduledDays} dia(s) sem jornada</span>}
          </p>
        </>
      )}
    </div>
  );
}
