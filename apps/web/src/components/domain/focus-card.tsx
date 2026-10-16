import { ArrowRight, CalendarClock, Target } from "lucide-react";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { priority, taskStatus, type Priority, type TaskStatus } from "@/lib/design-system/status";
import { StatusBadge } from "./status-badge";
import { ContextChip } from "./domain-tag";

/** Foco principal do Tech Lead (§5.2.1). Destaque máximo do dashboard — só existe um (RN-002). */
export function FocusCard({
  title,
  priority: p,
  status,
  due,
  overdue,
  nextAction,
  contexts = [],
  href,
  className,
}: {
  title: string;
  priority: Priority;
  status: TaskStatus;
  due?: string;
  overdue?: boolean;
  nextAction?: string;
  contexts?: string[];
  /** Detalhe da atividade; o título vira link. */
  href?: string;
  className?: string;
}) {
  return (
    <Card className={cn("relative overflow-hidden border-personal/40", className)}>
      <span aria-hidden className="absolute inset-y-0 left-0 w-1 bg-personal" />
      <div className="flex flex-col gap-3 p-4 pl-5">
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1 text-2xs font-semibold uppercase tracking-wide text-personal-fg">
            <Target className="size-3.5" aria-hidden /> Foco principal
          </span>
          <StatusBadge meta={priority[p]} size="sm" />
          <StatusBadge meta={taskStatus[status]} size="sm" variant="dot" />
        </div>
        <h3 className="text-base font-semibold leading-snug text-balance">
          {href ? (
            <Link href={href} className="rounded-sm hover:underline">
              {title}
            </Link>
          ) : (
            title
          )}
        </h3>
        {nextAction && (
          <p className="flex items-start gap-1.5 text-sm text-muted-foreground">
            <ArrowRight className="mt-0.5 size-4 shrink-0 text-personal" aria-hidden />
            <span>
              <span className="font-medium text-foreground">Próxima ação:</span> {nextAction}
            </span>
          </p>
        )}
        <div className="flex flex-wrap items-center gap-2">
          {due && (
            <span
              className={cn(
                "inline-flex items-center gap-1 text-xs tabular",
                overdue ? "font-medium text-danger-fg" : "text-muted-foreground",
              )}
            >
              <CalendarClock className="size-3.5" aria-hidden />
              {overdue ? `Venceu ${due}` : `Prazo ${due}`}
            </span>
          )}
          {contexts.map((c) => (
            <ContextChip key={c} code={c} />
          ))}
        </div>
      </div>
    </Card>
  );
}
