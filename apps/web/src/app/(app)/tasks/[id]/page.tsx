import { focusQueueSchema, projectSchema, taskSchema, teamSchema } from "@tlh/shared-contracts";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { z } from "zod";
import { ApiUnavailable } from "@/components/app/api-unavailable";
import { DetailSkeleton } from "@/components/app/page-skeletons";
import { PageHeader } from "@/components/app/page-header";
import { DomainTag } from "@/components/domain/domain-tag";
import { StatusBadge } from "@/components/domain/status-badge";
import { Alert } from "@/components/ui/alert";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FocusButtons } from "@/features/tasks/focus-buttons";
import { toQueueState } from "@/features/tasks/focus-queue-ops";
import { TaskForm } from "@/features/tasks/task-form";
import { TaskStatusActions } from "@/features/tasks/task-status-actions";
import { loadOpenWorkItems } from "@/lib/api/options";
import { loadApi, requireMe } from "@/lib/api/server";
import { formatBusinessDate, formatDateTime, formatHours } from "@/lib/format";
import { priority, taskDueState, taskStatus, taskType } from "@/lib/design-system/status";

export const metadata: Metadata = { title: "Atividade · Tech Lead Hub" };

export default function TaskPage({ params }: PageProps<"/tasks/[id]">) {
  return (
    <Suspense fallback={<DetailSkeleton />}>
      <TaskView params={params} />
    </Suspense>
  );
}

async function TaskView({ params }: Pick<PageProps<"/tasks/[id]">, "params">) {
  const { id } = await params;
  const [task, me, queue, teams, projects, workItems] = await Promise.all([
    loadApi(`/tasks/${id}`, taskSchema),
    requireMe(),
    loadApi("/focus-queue", focusQueueSchema),
    loadApi("/teams", z.array(teamSchema)),
    loadApi("/projects", z.array(projectSchema)),
    loadOpenWorkItems(),
  ]);
  if (!task.ok && task.reason === "not_found") notFound();
  if (!task.ok || !me.ok || !queue.ok || !teams.ok || !projects.ok || !workItems.ok) return <ApiUnavailable />;
  const t = task.data;
  const timeZone = me.data.workspace.timezone;
  const linked = new Set([...t.teams, ...t.projects].map((c) => c.id));

  return (
    <>
      <PageHeader
        eyebrow={<Link href="/tasks" className="hover:underline">Minhas atividades</Link>}
        title={t.title}
        description={
          <span className="flex flex-wrap items-center gap-1.5">
            <StatusBadge meta={taskStatus[t.status]} size="sm" />
            <StatusBadge meta={priority[t.priority]} size="sm" />
            <StatusBadge meta={taskType[t.type]} size="sm" variant="outline" />
            {t.dueState && <StatusBadge meta={taskDueState[t.dueState]} size="sm" />}
          </span>
        }
        actions={<TaskStatusActions task={t} />}
      />

      {t.status === "BLOCKED" && (
        <Alert tone="warning" title="Atividade bloqueada">
          {t.blockedReason ?? "Motivo não informado."}
        </Alert>
      )}

      <div className="grid items-start gap-4 lg:grid-cols-[1fr_20rem]">
        <Card>
          <CardHeader>
            <CardTitle>Dados da atividade</CardTitle>
            <CardDescription>Alterações são auditadas e usam controle de versão.</CardDescription>
            <CardAction>
              <DomainTag domain="personal" />
            </CardAction>
          </CardHeader>
          <CardContent>
            <TaskForm
              task={t}
              // Contextos ativos + os já vinculados, para não perder vínculos antigos ao salvar.
              teams={teams.data.filter((team) => team.status === "ACTIVE" || linked.has(team.id))}
              projects={projects.data.filter((p) => p.status !== "ARCHIVED" || linked.has(p.id))}
              workItems={[
                ...t.workItems.filter((w) => !workItems.data.items.some((open) => open.id === w.id)),
                ...workItems.data.items,
              ]}
            />
          </CardContent>
        </Card>

        <div className="flex flex-col gap-4">
          <Card>
            <CardHeader>
              <CardTitle>Foco</CardTitle>
              <CardDescription>
                {t.focus ? (t.focus.isPrimary ? "Foco principal." : `Posição ${t.focus.position + 1} na fila.`) : "Fora da fila de foco."}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <FocusButtons task={t} queue={toQueueState(queue.data)} />
              {(t.status === "DONE" || t.status === "CANCELLED") && (
                <p className="text-xs text-muted-foreground">Atividades encerradas não entram no foco (§6.6).</p>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Resumo</CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
                <dt className="text-muted-foreground">Prazo</dt>
                <dd className="tabular">{t.dueDate ? formatBusinessDate(t.dueDate) : "—"}</dd>
                <dt className="text-muted-foreground">Estimado</dt>
                <dd className="tabular">{formatHours(t.estimatedHours)}</dd>
                <dt className="text-muted-foreground">Realizado</dt>
                <dd className="tabular">{formatHours(t.actualHours)}</dd>
                <dt className="text-muted-foreground">Criada</dt>
                <dd className="tabular">{formatDateTime(t.createdAt, timeZone)}</dd>
                {t.completedAt && (
                  <>
                    <dt className="text-muted-foreground">Concluída</dt>
                    <dd className="tabular">{formatDateTime(t.completedAt, timeZone)}</dd>
                  </>
                )}
                {t.cancelledAt && (
                  <>
                    <dt className="text-muted-foreground">Cancelada</dt>
                    <dd className="tabular">{formatDateTime(t.cancelledAt, timeZone)}</dd>
                  </>
                )}
              </dl>
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}
