import { developerDetailSchema, teamSchema } from "@tlh/shared-contracts";
import { FolderKanban } from "lucide-react";
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
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar } from "@/components/ui/misc";
import { AddAssociationForm } from "@/features/organization/add-association-form";
import { AssociationList } from "@/features/organization/association-list";
import { DeveloperForm } from "@/features/organization/developer-form";
import { StatusActions } from "@/features/organization/status-actions";
import { CapacityCardSkeleton, DeveloperCapacityCard } from "@/features/capacity/context-cards";
import { DeliveriesCard, DeliveriesCardSkeleton } from "@/features/work-items/deliveries-card";
import { loadApi, requireMe } from "@/lib/api/server";
import { developerStatus, teamStatus } from "@/lib/design-system/status";

export const metadata: Metadata = { title: "Pessoa · Tech Lead Hub" };

export default function DeveloperPage({ params }: PageProps<"/developers/[id]">) {
  return (
    <Suspense fallback={<DetailSkeleton />}>
      <DeveloperView params={params} />
    </Suspense>
  );
}

async function DeveloperView({ params }: Pick<PageProps<"/developers/[id]">, "params">) {
  const { id } = await params;
  const [developer, me, teams] = await Promise.all([
    loadApi(`/developers/${id}`, developerDetailSchema),
    requireMe(),
    loadApi("/teams?status=ACTIVE", z.array(teamSchema)),
  ]);
  if (!developer.ok && developer.reason === "not_found") notFound();
  if (!developer.ok || !me.ok || !teams.ok) return <ApiUnavailable />;
  const d = developer.data;
  const active = d.status === "ACTIVE";
  const currentTeamIds = new Set(d.teams.map((t) => t.id));

  return (
    <>
      <PageHeader
        eyebrow={<Link href="/developers" className="hover:underline">Pessoas</Link>}
        title={
          <span className="flex flex-wrap items-center gap-2">
            <Avatar name={d.name} />
            {d.name}
            <StatusBadge meta={developerStatus[d.status]} size="sm" />
          </span>
        }
        description={d.roleDescription ?? undefined}
        actions={
          <StatusActions
            path={`/developers/${d.id}`}
            version={d.version}
            actions={
              active
                ? [{ status: "INACTIVE", label: "Desativar", icon: "userX", confirm: "Desativar o cadastro? O histórico é preservado." }]
                : [{ status: "ACTIVE", label: "Reativar", icon: "userCheck" }]
            }
          />
        }
      />

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Times</CardTitle>
            <CardDescription>Histórico de participação; mudanças de time preservam o período (§9.3).</CardDescription>
            <CardAction>
              <DomainTag domain="delivery" />
            </CardAction>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            {active && (
              <AddAssociationForm
                endpoint="team-developers"
                fixed={{ developerId: d.id }}
                field="teamId"
                label="Selecione um time"
                options={teams.data
                  .filter((t) => !currentTeamIds.has(t.id))
                  .map((t) => ({ id: t.id, label: `${t.code} · ${t.name}` }))}
              />
            )}
            <AssociationList
              endpoint="/team-developers"
              timeZone={me.data.workspace.timezone}
              empty="A pessoa ainda não participa de nenhum time."
              rows={d.memberships.map((a) => ({
                id: a.id,
                href: `/teams/${a.team.id}`,
                title: a.team.name,
                code: a.team.code,
                status: teamStatus[a.team.status],
                startedAt: a.startedAt,
                endedAt: a.endedAt,
              }))}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Projetos relacionados</CardTitle>
            <CardDescription>Projetos em que os times atuais da pessoa participam.</CardDescription>
          </CardHeader>
          <CardContent>
            {d.projects.length === 0 ? (
              <p className="flex items-center gap-2 text-xs text-muted-foreground">
                <FolderKanban className="size-4" aria-hidden />
                Nenhum projeto por meio dos times atuais.
              </p>
            ) : (
              <ul className="flex flex-col divide-y divide-border">
                {d.projects.map((p) => (
                  <li key={p.id} className="flex items-center gap-2 py-2.5">
                    <ContextChip code={p.code} />
                    <Link href={`/projects/${p.id}`} className="text-sm font-medium hover:underline">
                      {p.name}
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Suspense fallback={<CapacityCardSkeleton />}>
          <DeveloperCapacityCard developerId={d.id} />
        </Suspense>

        <Suspense fallback={<DeliveriesCardSkeleton />}>
          <DeliveriesCard
            filter={{ developerId: d.id }}
            description="Itens sob responsabilidade da pessoa. Histórico preservado após desativação (§10.4)."
            moreHref={`/work-items?developerId=${d.id}`}
          />
        </Suspense>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Cadastro</CardTitle>
            <CardDescription>Alterações são auditadas sem registrar e-mail ou anotações (§44.5).</CardDescription>
          </CardHeader>
          <CardContent>
            <DeveloperForm developer={d} />
          </CardContent>
        </Card>
      </div>
    </>
  );
}
