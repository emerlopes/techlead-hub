import { developerSchema, projectSchema, taskSchema, teamDetailSchema } from "@tlh/shared-contracts";
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
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AddAssociationForm } from "@/features/organization/add-association-form";
import { AssociationList } from "@/features/organization/association-list";
import { ContextForm } from "@/features/organization/context-form";
import { StatusActions } from "@/features/organization/status-actions";
import { CapacityCardSkeleton, TeamCapacityCard } from "@/features/capacity/context-cards";
import { DeliveriesCard, DeliveriesCardSkeleton } from "@/features/work-items/deliveries-card";
import { loadApi, requireMe, withQuery } from "@/lib/api/server";
import { developerStatus, projectStatus, teamStatus } from "@/lib/design-system/status";

export const metadata: Metadata = { title: "Time · Tech Lead Hub" };

export default function TeamPage({ params }: PageProps<"/teams/[id]">) {
  return (
    <Suspense fallback={<DetailSkeleton />}>
      <TeamDetail params={params} />
    </Suspense>
  );
}

async function TeamDetail({ params }: Pick<PageProps<"/teams/[id]">, "params">) {
  const { id } = await params;
  const [team, me, projects, developers, tasks] = await Promise.all([
    loadApi(`/teams/${id}`, teamDetailSchema),
    requireMe(),
    loadApi("/projects", z.array(projectSchema)),
    loadApi("/developers?status=ACTIVE", z.array(developerSchema)),
    loadApi(withQuery("/tasks", { teamId: id }), z.array(taskSchema)),
  ]);
  if (!team.ok && team.reason === "not_found") notFound();
  if (!team.ok || !me.ok || !projects.ok || !developers.ok || !tasks.ok) return <ApiUnavailable />;
  const t = team.data;
  const timeZone = me.data.workspace.timezone;
  const active = t.status === "ACTIVE";

  const activeProjectIds = new Set(t.projects.filter((p) => !p.endedAt).map((p) => p.project.id));
  const activeDeveloperIds = new Set(t.developers.filter((d) => !d.endedAt).map((d) => d.developer.id));

  return (
    <>
      <PageHeader
        eyebrow={<Link href="/teams" className="hover:underline">Times</Link>}
        title={
          <span className="flex flex-wrap items-center gap-2">
            <ContextChip code={t.code} className="h-6 text-xs" />
            {t.name}
            <StatusBadge meta={teamStatus[t.status]} size="sm" />
          </span>
        }
        description={t.description ?? undefined}
        actions={
          <StatusActions
            path={`/teams/${t.id}`}
            version={t.version}
            actions={
              active
                ? [{ status: "INACTIVE", label: "Desativar", icon: "powerOff", confirm: "Desativar o time? O histórico é preservado." }]
                : [{ status: "ACTIVE", label: "Reativar", icon: "power" }]
            }
          />
        }
      />

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Projetos</CardTitle>
            <CardDescription>Participação do time em projetos (§9.1).</CardDescription>
            <CardAction>
              <DomainTag domain="delivery" />
            </CardAction>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            {active && (
              <AddAssociationForm
                endpoint="team-projects"
                fixed={{ teamId: t.id }}
                field="projectId"
                label="Selecione um projeto"
                options={projects.data
                  .filter((p) => p.status !== "ARCHIVED" && !activeProjectIds.has(p.id))
                  .map((p) => ({ id: p.id, label: `${p.code} · ${p.name}` }))}
              />
            )}
            <AssociationList
              endpoint="/team-projects"
              timeZone={timeZone}
              empty="O time ainda não participa de projetos."
              rows={t.projects.map((a) => ({
                id: a.id,
                href: `/projects/${a.project.id}`,
                title: a.project.name,
                code: a.project.code,
                status: projectStatus[a.project.status],
                isPrimary: a.isPrimary,
                startedAt: a.startedAt,
                endedAt: a.endedAt,
              }))}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Pessoas</CardTitle>
            <CardDescription>Desenvolvedores podem participar de vários times (RN-014).</CardDescription>
            <CardAction>
              <DomainTag domain="delivery" />
            </CardAction>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            {active && (
              <AddAssociationForm
                endpoint="team-developers"
                fixed={{ teamId: t.id }}
                field="developerId"
                label="Selecione uma pessoa"
                options={developers.data
                  .filter((d) => !activeDeveloperIds.has(d.id))
                  .map((d) => ({ id: d.id, label: d.roleDescription ? `${d.name} · ${d.roleDescription}` : d.name }))}
              />
            )}
            <AssociationList
              endpoint="/team-developers"
              timeZone={timeZone}
              empty="Nenhuma pessoa associada ao time."
              rows={t.developers.map((a) => ({
                id: a.id,
                href: `/developers/${a.developer.id}`,
                title: a.developer.name,
                status: developerStatus[a.developer.status],
                startedAt: a.startedAt,
                endedAt: a.endedAt,
              }))}
            />
          </CardContent>
        </Card>

        <Suspense fallback={<CapacityCardSkeleton />}>
          <TeamCapacityCard teamId={t.id} />
        </Suspense>

        <Suspense fallback={<DeliveriesCardSkeleton />}>
          <DeliveriesCard filter={{ teamId: t.id }} description="Itens executados pelo time, de qualquer projeto." />
        </Suspense>

        <Card>
          <CardHeader>
            <CardTitle>Minhas atividades neste time</CardTitle>
            <CardDescription>Atividades abertas vinculadas ao time.</CardDescription>
            <CardAction>
              <DomainTag domain="personal" />
            </CardAction>
          </CardHeader>
          <CardContent>
            {tasks.data.length === 0 ? (
              <p className="flex items-center gap-2 text-xs text-muted-foreground">
                <ListTodo className="size-4" aria-hidden />
                Nenhuma atividade aberta ligada a este time.
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

        <Card>
          <CardHeader>
            <CardTitle>Dados do time</CardTitle>
            <CardDescription>Alterações são auditadas e usam controle de versão.</CardDescription>
          </CardHeader>
          <CardContent>
            <ContextForm kind="team" entity={t} />
          </CardContent>
        </Card>
      </div>
    </>
  );
}
