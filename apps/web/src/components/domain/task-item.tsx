import type { Task } from "@tlh/shared-contracts";
import { ArrowRight, Target } from "lucide-react";
import Link from "next/link";
import { formatBusinessDate } from "@/lib/format";
import { priority, taskDueState, taskStatus } from "@/lib/design-system/status";
import { cn } from "@/lib/utils";
import { ContextChip } from "./domain-tag";
import { StatusBadge } from "./status-badge";

/**
 * Atividade pessoal em uma linha compacta (listas do dashboard, Kanban, agenda). Mostra o alerta
 * de prazo independentemente da posição na fila de foco (§6.6) e os contextos sem duplicar a
 * atividade (§6.8).
 */
export function TaskItem({
  task,
  showStatus = true,
  showNextAction = false,
  className,
}: {
  task: Task;
  showStatus?: boolean;
  showNextAction?: boolean;
  className?: string;
}) {
  return (
    <div className={cn("flex min-w-0 flex-col gap-1.5", className)}>
      <div className="flex min-w-0 items-start gap-2">
        {task.focus && (
          <Target
            className={cn("mt-0.5 size-4 shrink-0", task.focus.isPrimary ? "text-personal" : "text-subtle-foreground")}
            aria-label={task.focus.isPrimary ? "Foco principal" : "Em foco"}
          />
        )}
        <Link
          href={`/tasks/${task.id}`}
          className={cn(
            "min-w-0 flex-1 rounded-sm text-sm font-medium break-words hover:underline",
            task.status === "DONE" || task.status === "CANCELLED" ? "text-muted-foreground line-through" : "",
          )}
        >
          {task.title}
        </Link>
      </div>
      <div className="flex flex-wrap items-center gap-1.5">
        <StatusBadge meta={priority[task.priority]} size="sm" />
        {showStatus && <StatusBadge meta={taskStatus[task.status]} size="sm" variant="dot" />}
        {task.dueState ? (
          <StatusBadge
            meta={{ ...taskDueState[task.dueState], label: `${taskDueState[task.dueState].label} · ${formatBusinessDate(task.dueDate ?? "")}` }}
            size="sm"
          />
        ) : (
          task.dueDate && (
            <span className="text-2xs text-muted-foreground tabular">Prazo {formatBusinessDate(task.dueDate)}</span>
          )
        )}
        {[...task.teams, ...task.projects].map((c) => (
          <ContextChip key={c.id} code={c.code} name={c.name} />
        ))}
      </div>
      {showNextAction && task.nextAction && (
        <p className="flex items-start gap-1 text-xs text-muted-foreground">
          <ArrowRight className="mt-0.5 size-3 shrink-0 text-personal" aria-hidden />
          <span className="break-words">{task.nextAction}</span>
        </p>
      )}
    </div>
  );
}
