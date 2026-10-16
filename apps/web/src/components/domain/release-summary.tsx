import type { Release } from "@tlh/shared-contracts";
import { ShieldAlert } from "lucide-react";
import Link from "next/link";
import { Progress } from "@/components/ui/progress";
import { healthStatus, releaseStatus } from "@/lib/design-system/status";
import { formatHours } from "@/lib/format";
import { DateDelta } from "./date-delta";
import { ContextChip } from "./domain-tag";
import { StatusBadge } from "./status-badge";

/**
 * Release em uma linha (§5.2.5): projeto, compromisso × previsão, saúde, pendências (em contagem e,
 * com estimativas, em horas) e riscos. Times
 * participantes aparecem sem duplicar a release (§12.5).
 */
export function ReleaseSummary({ release }: { release: Release }) {
  const { required, requiredDone, optional, optionalDone, requiredRemainingHours, requiredUnestimated } = release.progress;
  const pending = required - requiredDone;
  return (
    <div className="flex min-w-0 flex-wrap items-start justify-between gap-3">
      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <ContextChip code={release.project.code} name={release.project.name} />
          <Link href={`/releases/${release.id}`} className="min-w-0 text-sm font-medium break-words hover:underline">
            {release.name}
          </Link>
          <StatusBadge meta={releaseStatus[release.status]} size="sm" variant="dot" />
          {release.health && <StatusBadge meta={healthStatus[release.health]} size="sm" />}
        </div>
        <div className="flex flex-wrap items-center gap-3 text-2xs text-muted-foreground">
          <span className="tabular">
            <span className="font-medium text-foreground">{requiredDone}</span>/{required} obrigatórios
          </span>
          {optional > 0 && (
            <span className="tabular">
              {optionalDone}/{optional} opcionais
            </span>
          )}
          {pending > 0 && requiredUnestimated < pending && (
            <span className="tabular">{formatHours(requiredRemainingHours)} restantes</span>
          )}
          {requiredUnestimated > 0 && <span className="font-medium text-attention-fg">{requiredUnestimated} sem estimativa</span>}
          {release.teams.map((t) => (
            <ContextChip key={t.id} code={t.code} name={t.name} />
          ))}
          {release.openRiskCount > 0 && (
            <span className="inline-flex items-center gap-1 font-medium text-warning-fg">
              <ShieldAlert className="size-3" aria-hidden />
              {release.openRiskCount} risco{release.openRiskCount > 1 ? "s" : ""}
            </span>
          )}
        </div>
        {required > 0 && (
          <Progress value={requiredDone} max={required} tone="delivery" label={`${requiredDone} de ${required} obrigatórios concluídos`} />
        )}
      </div>
      <DateDelta committed={release.committedDate} forecast={release.forecastDate} source="MANUAL" />
    </div>
  );
}
