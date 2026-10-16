import type { Sprint } from "@tlh/shared-contracts";
import { OctagonX, ShieldAlert } from "lucide-react";
import Link from "next/link";
import { Progress } from "@/components/ui/progress";
import { sprintStatus } from "@/lib/design-system/status";
import { formatBusinessDate } from "@/lib/format";
import { ContextChip } from "./domain-tag";
import { StatusBadge } from "./status-badge";

/**
 * Sprint em uma linha (§5.2.4): time, período, entregas concluídas, bloqueios e riscos.
 * Capacidade planejada e demanda chegam com a Etapa 4 — não são estimadas aqui (§3.4).
 */
export function SprintSummary({ sprint }: { sprint: Sprint }) {
  const { total, done, blocked, openRisks } = sprint.counts;
  return (
    <div className="flex min-w-0 flex-col gap-2">
      <div className="flex flex-wrap items-center gap-2">
        <ContextChip code={sprint.team.code} name={sprint.team.name} />
        <Link href={`/sprints/${sprint.id}`} className="min-w-0 text-sm font-medium break-words hover:underline">
          {sprint.name}
        </Link>
        <StatusBadge meta={sprintStatus[sprint.status]} size="sm" />
        <span className="text-2xs text-muted-foreground tabular">
          {formatBusinessDate(sprint.startDate)} – {formatBusinessDate(sprint.endDate)}
        </span>
      </div>
      <div className="flex flex-wrap items-center gap-3 text-2xs text-muted-foreground">
        <span className="tabular">
          <span className="font-medium text-foreground">{done}</span>/{total} concluídas
        </span>
        {blocked > 0 && (
          <span className="inline-flex items-center gap-1 font-medium text-blocked-fg">
            <OctagonX className="size-3" aria-hidden />
            {blocked} bloqueada{blocked > 1 ? "s" : ""}
          </span>
        )}
        {openRisks > 0 && (
          <span className="inline-flex items-center gap-1 font-medium text-warning-fg">
            <ShieldAlert className="size-3" aria-hidden />
            {openRisks} risco{openRisks > 1 ? "s" : ""}
          </span>
        )}
      </div>
      {total > 0 && <Progress value={done} max={total} tone="delivery" label={`${done} de ${total} entregas concluídas`} />}
    </div>
  );
}
