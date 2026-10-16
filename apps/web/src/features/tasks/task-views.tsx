import { type Task, taskStatuses } from "@tlh/shared-contracts";
import { CalendarDays, Columns3, List } from "lucide-react";
import { StatusBadge } from "@/components/domain/status-badge";
import { TaskItem } from "@/components/domain/task-item";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatBusinessDateLong } from "@/lib/format";
import { taskDueState, taskStatus } from "@/lib/design-system/status";

/** Visualizações de Minhas Atividades (§6.2): lista, Kanban e agenda. */
export function TaskViews({ tasks, today }: { tasks: Task[]; today: string }) {
  return (
    <Tabs defaultValue="list">
      <TabsList aria-label="Visualização">
        <TabsTrigger value="list">
          <List aria-hidden />
          Lista
        </TabsTrigger>
        <TabsTrigger value="kanban">
          <Columns3 aria-hidden />
          Kanban
        </TabsTrigger>
        <TabsTrigger value="agenda">
          <CalendarDays aria-hidden />
          Agenda
        </TabsTrigger>
      </TabsList>
      <TabsContent value="list">
        <Card>
          <TaskRows tasks={tasks} className="px-4" />
        </Card>
      </TabsContent>
      <TabsContent value="kanban">
        <TaskKanban tasks={tasks} />
      </TabsContent>
      <TabsContent value="agenda">
        <TaskAgenda tasks={tasks} today={today} />
      </TabsContent>
    </Tabs>
  );
}

function TaskRows({ tasks, className }: { tasks: Task[]; className?: string }) {
  return (
    <ul className={`flex flex-col divide-y divide-border ${className ?? ""}`}>
      {tasks.map((task) => (
        <li key={task.id} className="py-3">
          <TaskItem task={task} showNextAction />
        </li>
      ))}
    </ul>
  );
}

/** Colunas por situação; encerradas só aparecem quando há itens no filtro atual. */
function TaskKanban({ tasks }: { tasks: Task[] }) {
  const columns = taskStatuses.filter(
    (status) => status === "TODO" || status === "IN_PROGRESS" || status === "BLOCKED" || tasks.some((t) => t.status === status),
  );
  return (
    <div className="grid gap-3 md:grid-cols-3">
      {columns.map((status) => {
        const items = tasks.filter((t) => t.status === status);
        return (
          <section key={status} aria-label={taskStatus[status].label} className="flex min-w-0 flex-col gap-2 rounded-lg bg-surface-sunken p-2">
            <header className="flex items-center justify-between px-1">
              <StatusBadge meta={taskStatus[status]} size="sm" variant="dot" />
              <span className="font-mono text-xs text-muted-foreground tabular">{items.length}</span>
            </header>
            {items.length === 0 ? (
              <p className="px-1 py-3 text-center text-xs text-muted-foreground">Nada aqui.</p>
            ) : (
              items.map((task) => (
                <Card key={task.id} className="p-3">
                  <TaskItem task={task} showStatus={false} />
                </Card>
              ))
            )}
          </section>
        );
      })}
    </div>
  );
}

/** Agenda por prazo: atrasadas primeiro, depois cada dia, e por fim as sem prazo (§3.4). */
function TaskAgenda({ tasks, today }: { tasks: Task[]; today: string }) {
  const overdue = tasks.filter((t) => t.dueState === "OVERDUE");
  const dated = tasks.filter((t) => t.dueDate && t.dueState !== "OVERDUE");
  const undated = tasks.filter((t) => !t.dueDate);
  const days = [...new Set(dated.map((t) => t.dueDate as string))].sort();

  return (
    <div className="flex flex-col gap-3">
      {overdue.length > 0 && (
        <AgendaGroup title={<StatusBadge meta={taskDueState.OVERDUE} size="sm" />} tasks={overdue} />
      )}
      {days.map((day) => (
        <AgendaGroup
          key={day}
          title={
            <span className="text-xs font-semibold first-letter:uppercase">
              {day === today ? "Hoje · " : ""}
              {formatBusinessDateLong(day)}
            </span>
          }
          tasks={dated.filter((t) => t.dueDate === day)}
        />
      ))}
      {undated.length > 0 && (
        <AgendaGroup title={<span className="text-xs font-semibold text-muted-foreground">Sem prazo</span>} tasks={undated} />
      )}
    </div>
  );
}

function AgendaGroup({ title, tasks }: { title: React.ReactNode; tasks: Task[] }) {
  return (
    <Card>
      <div className="border-b border-border px-4 py-2">{title}</div>
      <TaskRows tasks={tasks} className="px-4" />
    </Card>
  );
}
