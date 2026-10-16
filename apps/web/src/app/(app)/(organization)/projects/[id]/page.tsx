import { type ProjectDetail as Project, projectDetailSchema, taskSchema, teamSchema } from "@tlh/shared-contracts";
import { ListTodo } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { z } from "zod";
import { ApiUnavailable } from "@/components/app/api-unavailable";
import { DetailSkeleton } from "@/components/app/page-skeletons";
import { PageHeader } from "@/components/app/page-header";
import { ContextChip, DomainTag } from "@/components/domain/domain-tag";
import { StatusBadge } from "@/components/domain/status-badge";
import { TaskItem } from "@/components/domain/task-item";
import { Alert } from "@/components/ui/alert";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AddAssociationForm } from "@/features/organization/add-association-form";
import { AssociationList } from "@/features/organization/association-list";
import { ContextForm } from "@/features/organization/context-form";
import { type StatusAction, StatusActions } from "@/features/organization/status-actions";
import { DeliveriesCard, DeliveriesCardSkeleton } from "@/features/work-items/deliveries-card";
import { loadApi, requireMe, withQuery } from "@/lib/api/server";
import { projectStatus, teamStatus } from "@/lib/design-system/status";

export const metadata: Metadata = { title: "Projeto · Tech Lead Hub" };

const archive: StatusAction = {
  status: "ARCHIVED",
  label: "Arquivar",
  icon: "archive",
  confirm: "Arquivar o projeto? Ele continua consultável (RN-024).",
};
const reactivate: StatusAction = { status: "ACTIVE", label: "Reativar", icon: "play" };

/** Pausar, arquivar e reativar (§8.2). */
const transitions: Record<Project["status"], StatusAction[]> = {
  ACTIVE: [{ status: "PAUSED", label: "Pausar", icon: "pause" }, archive],
  PAUSED: [reactivate, archive],
  ARCHIVED: [reactivate],
};

export default function ProjectPage({ params }: PageProps<"/projects/[id]">) {
  return (
    <Suspense fallback={<DetailSkeleton />}>
      <ProjectView params={params} />
    </Suspense>
  );
}

async function ProjectView({ params }: Pick<PageProps<"/projects/[id]">, "params">) {
  const { id } = await params;
  const [project, me, teams, tasks] = await Promise.all([
    loadApi(`/projects/${id}`, projectDetailSchema),
    requireMe(),
    loadApi("/teams?status=ACTIVE", z.array(teamSchema)),
    loadApi(withQuery("/tasks", { projectId: id }), z.array(taskSchema)),
  ]);
  if (!project.ok && project.reason === "not_found") notFound();
  if (!project.ok || !me.ok || !teams.ok || !tasks.ok) return <ApiUnavailable />;
  const p = project.data;
  const archived = p.status === "ARCHIVED";
  const activeTeamIds = new Set(p.teams.filter((a) => !a.endedAt).map((a) => a.team.id));

  return (
    <>
      <PageHeader
        eyebrow={<Link href="/projects" className="hover:underline">Projetos</Link>}
        title={
          <span className="flex flex-wrap items-center gap-2">
            <ContextChip code={p.code} className="h-6 text-xs" />
            {p.name}
            <StatusBadge meta={projectStatus[p.status]} size="sm" />
          </span>
        }
        description={p.description ?? undefined}
        actions={<StatusActions path={`/projects/${p.id}`} version={p.version} actions={transitions[p.status]} />}
      />

      {archived && (
        <Alert tone="info" title="Projeto arquivado">
          Continua consultável com todo o histórico, mas não recebe novos times nem novas atividades (§8.5).
        </Alert>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Times participantes</CardTitle>
            <CardDescription>Um projeto pode envolver vários times (RN-013).</CardDescription>
            <CardAction>
              <DomainTag domain="delivery" />
            </CardAction>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            {!archived && (
              <AddAssociationForm
                endpoint="team-projects"
                fixed={{ projectId: p.id }}
                field="teamId"
                label="Selecione um time"
                options={teams.data
                  .filter((t) => !activeTeamIds.has(t.id))
                  .map((t) => ({ id: t.id, label: `${t.code} · ${t.name}` }))}
              />
            )}
            <AssociationList
              endpoint="/team-projects"
              timeZone={me.data.workspace.timezone}
              empty="Nenhum time associado ao projeto."
              rows={p.teams.map((a) => ({
                id: a.id,
                href: `/teams/${a.team.id}`,
                title: a.team.name,
                code: a.team.code,
                status: teamStatus[a.team.status],
                isPrimary: a.isPrimary,
                startedAt: a.startedAt,
                endedAt: a.endedAt,
              }))}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Minhas atividades neste projeto</CardTitle>
            <CardDescription>Atividades abertas vinculadas ao projeto.</CardDescription>
            <CardAction>
              <DomainTag domain="personal" />
            </CardAction>
          </CardHeader>
          <CardContent>
            {tasks.data.length === 0 ? (
              <p className="flex items-center gap-2 text-xs text-muted-foreground">
                <ListTodo className="size-4" aria-hidden />
                Nenhuma atividade aberta ligada a este projeto.
              </p>
            ) : (
              <ul className="flex flex-col divide-y divide-border">
                {tasks.data.map((task) => (
                  <li key={task.id} className="py-2.5">
                    <TaskItem task={task} />
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Suspense fallback={<DeliveriesCardSkeleton />}>
          <DeliveriesCard filter={{ projectId: p.id }} description="Itens com este projeto de referência, de qualquer time (RN-018)." />
        </Suspense>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Dados do projeto</CardTitle>
            <CardDescription>Alterações são auditadas e usam controle de versão.</CardDescription>
          </CardHeader>
          <CardContent>
            <ContextForm kind="project" entity={p} />
          </CardContent>
        </Card>
      </div>
    </>
  );
}
