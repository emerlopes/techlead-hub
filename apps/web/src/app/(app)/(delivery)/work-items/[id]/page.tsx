import {
  daysSince,
  developerSchema,
  externalSourceSchema,
  journalEntrySchema,
  paginatedSchema,
  projectSchema,
  sprintSchema,
  teamSchema,
  type WorkItemDetail,
  workItemDetailSchema,
} from "@tlh/shared-contracts";
import { ExternalLink } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { z } from "zod";
import { ApiUnavailable } from "@/components/app/api-unavailable";
import { DetailSkeleton } from "@/components/app/page-skeletons";
import { PageHeader } from "@/components/app/page-header";
import { DateDelta } from "@/components/domain/date-delta";
import { ContextChip, DomainTag } from "@/components/domain/domain-tag";
import { HealthIndicator } from "@/components/domain/health-indicator";
import { LinkChips } from "@/components/domain/link-chips";
import { StaleIndicator } from "@/components/domain/stale-indicator";
import { StatusBadge } from "@/components/domain/status-badge";
import { Alert } from "@/components/ui/alert";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { JournalCard } from "@/features/journal/journal-card";
import { RiskListCard } from "@/features/risks/risk-list-card";
import { RefinementPanel } from "@/features/work-items/refinement-panel";
import { TrackingHistory } from "@/features/work-items/tracking-history";
import { WorkItemActions } from "@/features/work-items/work-item-actions";
import { WorkItemForm } from "@/features/work-items/work-item-form";
import { loadApi, requireMe, withQuery } from "@/lib/api/server";
import {
  blockingLevel,
  executionStatus,
  refinementStatus,
  scopeType,
  sprintExitReason,
  workItemType,
} from "@/lib/design-system/status";
import { formatDateTime, formatHours } from "@/lib/format";

export const metadata: Metadata = { title: "Item · Tech Lead Hub" };

export default function WorkItemPage({ params }: PageProps<"/work-items/[id]">) {
  return (
    <Suspense fallback={<DetailSkeleton />}>
      <WorkItemView params={params} />
    </Suspense>
  );
}

async function WorkItemView({ params }: Pick<PageProps<"/work-items/[id]">, "params">) {
  const { id } = await params;
  const [item, me, sources, projects, teams, developers, sprints, journal] = await Promise.all([
    loadApi(`/work-items/${id}`, workItemDetailSchema),
    requireMe(),
    loadApi("/external-sources", z.array(externalSourceSchema)),
    loadApi("/projects", z.array(projectSchema)),
    loadApi("/teams", z.array(teamSchema)),
    loadApi("/developers", z.array(developerSchema)),
    loadApi("/sprints", z.array(sprintSchema)),
    loadApi(withQuery("/journal", { workItemId: id, pageSize: "20" }), paginatedSchema(journalEntrySchema)),
  ]);
  if (!item.ok && item.reason === "not_found") notFound();
  if (!item.ok || !me.ok || !sources.ok || !projects.ok || !teams.ok || !developers.ok || !sprints.ok || !journal.ok) {
    return <ApiUnavailable />;
  }
  const w = item.data;
  const t = w.tracking;
  const timeZone = me.data.workspace.timezone;
  const closed = w.executionStatus === "DONE" || w.executionStatus === "CANCELLED";
  const impediments = w.openRisks.filter((r) => r.type === "IMPEDIMENT");

  return (
    <>
      <PageHeader
        eyebrow={<Link href="/work-items" className="hover:underline">Entregas</Link>}
        title={
          <span className="flex flex-wrap items-center gap-2">
            <span className="font-mono text-base text-muted-foreground">{w.externalKey}</span>
            {w.title}
          </span>
        }
        description={
          <span className="flex flex-wrap items-center gap-1.5">
            <HealthIndicator tracking={t} />
            <StatusBadge meta={executionStatus[w.executionStatus]} size="sm" />
            <StatusBadge meta={refinementStatus[w.refinementStatus]} size="sm" variant="outline" />
            <StatusBadge meta={workItemType[w.itemType]} size="sm" variant="outline" />
            <ContextChip code={w.project.code} name={w.project.name} />
            {w.externalUrl && (
              <a
                href={w.externalUrl}
                target="_blank"
                rel="noreferrer noopener"
                className="pressable inline-flex items-center gap-1 rounded text-xs text-primary hover:underline"
              >
                <ExternalLink className="size-3.5" aria-hidden />
                Abrir em {w.source.name}
              </a>
            )}
          </span>
        }
        actions={<WorkItemActions item={w} />}
      />

      {impediments.length > 0 && (
        <Alert tone="danger" title="Impedimento ativo">
          {impediments.map((r) => (
            <span key={r.id} className="mr-3 inline-flex items-center gap-1.5">
              <Link href={`/risks/${r.id}`} className="hover:underline">
                {r.title}
              </Link>
              {r.blockingLevel && <StatusBadge meta={blockingLevel[r.blockingLevel]} size="sm" />}
            </span>
          ))}
        </Alert>
      )}
      {t.stale && (
        <Alert tone="warning" title="Acompanhamento desatualizado">
          Sem verificação recente. Confira o item na ferramenta externa e registre a verificação (§14.5).
        </Alert>
      )}

      <div className="grid items-start gap-4 lg:grid-cols-[1fr_22rem]">
        <div className="flex min-w-0 flex-col gap-4">
          <Card>
            <CardHeader>
              <CardTitle>Acompanhamento</CardTitle>
              <CardDescription>Alterações são auditadas, usam controle de versão e preservam histórico (CA-006).</CardDescription>
              <CardAction>
                <DomainTag domain="delivery" />
              </CardAction>
            </CardHeader>
            <CardContent>
              <WorkItemForm
                item={w}
                sources={sources.data}
                projects={projects.data.filter((p) => p.status !== "ARCHIVED" || p.id === w.project.id)}
                teams={teams.data.filter((team) => team.status === "ACTIVE" || team.id === t.executingTeam?.id)}
                developers={developers.data.filter((d) => d.status === "ACTIVE" || d.id === t.developer?.id)}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Refinamento</CardTitle>
              <CardDescription>Independente da execução (RN-007, CA-005).</CardDescription>
            </CardHeader>
            <CardContent>
              <RefinementPanel
                workItemId={w.id}
                version={w.version}
                refinement={w.refinement}
                sprints={sprints.data.filter((s) => s.status === "PLANNED" || s.status === "ACTIVE")}
                closed={closed}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Histórico do acompanhamento</CardTitle>
              <CardDescription>Fotografia após cada mudança de situação, previsão, responsável ou time (RN-006).</CardDescription>
            </CardHeader>
            <CardContent>
              <TrackingHistory entries={w.trackingHistory} timeZone={timeZone} />
            </CardContent>
          </Card>
        </div>

        <div className="flex min-w-0 flex-col gap-4">
          <Summary item={w} timeZone={timeZone} />
          <PlanningCard item={w} />
          <RiskListCard risks={w.openRisks} newHref={`/risks/new?workItemId=${w.id}`} empty="Nenhum risco ou impedimento aberto." />
          <Card>
            <CardHeader>
              <CardTitle>Atividades vinculadas</CardTitle>
              <CardDescription>Minhas atividades sobre este item (§6.8).</CardDescription>
              <CardAction>
                <DomainTag domain="personal" />
              </CardAction>
            </CardHeader>
            <CardContent>
              <LinkChips links={{ tasks: w.tasks }} empty="Nenhuma atividade pessoal vinculada." />
            </CardContent>
          </Card>
          <JournalCard entries={journal.data.items} href={`/journal?workItemId=${w.id}`} />
        </div>
      </div>
    </>
  );
}

function Summary({ item, timeZone }: { item: WorkItemDetail; timeZone: string }) {
  const t = item.tracking;
  return (
    <Card>
      <CardHeader>
        <CardTitle>Resumo</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <DateDelta committed={t.committedDate} forecast={t.manualForecastDate} source="MANUAL" />
        <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
          <dt className="text-muted-foreground">Time</dt>
          <dd>{t.executingTeam ? <ContextChip code={t.executingTeam.code} name={t.executingTeam.name} /> : "—"}</dd>
          <dt className="text-muted-foreground">Responsável</dt>
          <dd>{t.developer?.name ?? "—"}</dd>
          <dt className="text-muted-foreground">Restante</dt>
          <dd className="tabular">{formatHours(t.remainingEffortHours)}</dd>
          <dt className="text-muted-foreground">Verificação</dt>
          <dd className="flex flex-col gap-0.5">
            <StaleIndicator lastCheckedDaysAgo={daysSince(t.lastCheckedAt)} />
            {t.lastCheckedAt && <span className="text-2xs text-muted-foreground tabular">{formatDateTime(t.lastCheckedAt, timeZone)}</span>}
          </dd>
          {item.completedAt && (
            <>
              <dt className="text-muted-foreground">Concluído</dt>
              <dd className="tabular">{formatDateTime(item.completedAt, timeZone)}</dd>
            </>
          )}
        </dl>
      </CardContent>
    </Card>
  );
}

function PlanningCard({ item }: { item: WorkItemDetail }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Sprints e releases</CardTitle>
        <CardDescription>Movimentações preservam histórico (CA-007, RN-009).</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-3 text-sm">
        {item.sprintHistory.length === 0 ? (
          <p className="text-xs text-muted-foreground">Ainda não planejado em sprint.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {item.sprintHistory.map((m) => (
              <li key={m.id} className="flex flex-wrap items-center gap-1.5">
                <Link href={`/sprints/${m.sprint.id}`} className="font-medium hover:underline">
                  {m.sprint.name}
                </Link>
                <StatusBadge meta={scopeType[m.scopeType]} size="sm" variant="outline" />
                {m.exitReason ? (
                  <StatusBadge meta={sprintExitReason[m.exitReason]} size="sm" variant="dot" />
                ) : (
                  <span className="text-2xs font-medium text-info-fg">corrente</span>
                )}
              </li>
            ))}
          </ul>
        )}
        <div className="flex flex-col gap-1.5">
          <span className="text-xs text-muted-foreground">Releases</span>
          {item.releaseHistory.length === 0 ? (
            <span className="text-xs text-muted-foreground">Nenhuma release.</span>
          ) : (
            <ul className="flex flex-col gap-1">
              {item.releaseHistory.map((m) => (
                <li key={m.id} className="flex flex-wrap items-center gap-1.5">
                  <Link
                    href={`/releases/${m.release.id}`}
                    className={m.removedAt ? "text-muted-foreground line-through hover:underline" : "font-medium hover:underline"}
                  >
                    {m.release.name}
                  </Link>
                  <span className="text-2xs text-muted-foreground">
                    {m.removedAt ? "retirado do escopo" : m.isRequired ? "obrigatório" : "opcional"}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
