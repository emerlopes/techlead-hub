import { daysSince, type WorkItem } from "@tlh/shared-contracts";
import { ExternalLink } from "lucide-react";
import Link from "next/link";
import { formatBusinessDate } from "@/lib/format";
import { executionStatus, workItemType } from "@/lib/design-system/status";
import { cn } from "@/lib/utils";
import { ContextChip } from "./domain-tag";
import { HealthIndicator } from "./health-indicator";
import { StaleIndicator } from "./stale-indicator";
import { StatusBadge } from "./status-badge";

/**
 * Item externo acompanhado em uma linha compacta: identificador, saúde, execução, responsável,
 * compromisso e verificação (§14). Encerrados ficam esmaecidos.
 */
export function WorkItemRow({
  item,
  showProject = true,
  aside,
  className,
}: {
  item: WorkItem;
  showProject?: boolean;
  /** Ações ou metadados à direita (ex.: remover do escopo). */
  aside?: React.ReactNode;
  className?: string;
}) {
  const closed = item.executionStatus === "DONE" || item.executionStatus === "CANCELLED";
  const t = item.tracking;
  return (
    <div className={cn("flex min-w-0 flex-wrap items-start justify-between gap-2", className)}>
      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
        <div className="flex min-w-0 items-start gap-2">
          <span className="mt-px shrink-0 font-mono text-xs font-medium text-muted-foreground">{item.externalKey}</span>
          <Link
            href={`/work-items/${item.id}`}
            className={cn("min-w-0 flex-1 text-sm font-medium break-words hover:underline", closed && "text-muted-foreground line-through")}
          >
            {item.title}
          </Link>
          {item.externalUrl && (
            <a
              href={item.externalUrl}
              target="_blank"
              rel="noreferrer noopener"
              aria-label={`Abrir ${item.externalKey} em ${item.source.name}`}
              className="pressable mt-0.5 shrink-0 rounded-sm text-subtle-foreground hover:text-foreground"
            >
              <ExternalLink className="size-3.5" aria-hidden />
            </a>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          <HealthIndicator tracking={t} />
          <StatusBadge meta={executionStatus[item.executionStatus]} size="sm" variant="dot" />
          <StatusBadge meta={workItemType[item.itemType]} size="sm" variant="outline" showIcon={false} />
          {showProject && <ContextChip code={item.project.code} name={item.project.name} />}
          {t.executingTeam && <ContextChip code={t.executingTeam.code} name={t.executingTeam.name} />}
          {t.developer && <span className="text-2xs text-muted-foreground">{t.developer.name}</span>}
          {t.committedDate && (
            <span className="text-2xs text-muted-foreground tabular">Compromisso {formatBusinessDate(t.committedDate)}</span>
          )}
          {item.currentSprint && <span className="text-2xs text-muted-foreground">· {item.currentSprint.name}</span>}
          {!closed && <StaleIndicator lastCheckedDaysAgo={daysSince(t.lastCheckedAt)} />}
        </div>
      </div>
      {aside && <div className="flex shrink-0 items-center gap-1.5">{aside}</div>}
    </div>
  );
}
