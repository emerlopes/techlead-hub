import { journalEntrySchema, paginatedSchema, projectSchema, releaseDetailSchema, riskSchema } from "@tlh/shared-contracts";
import { FileText } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { z } from "zod";
import { ApiUnavailable } from "@/components/app/api-unavailable";
import { DetailSkeleton } from "@/components/app/page-skeletons";
import { DeleteButton } from "@/components/app/delete-button";
import { PageHeader } from "@/components/app/page-header";
import { DateDelta } from "@/components/domain/date-delta";
import { ContextChip, DomainTag } from "@/components/domain/domain-tag";
import { HistoryList } from "@/components/domain/history-list";
import { StatusBadge } from "@/components/domain/status-badge";
import { WorkItemRow } from "@/components/domain/work-item-row";
import { Alert } from "@/components/ui/alert";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { JournalCard } from "@/features/journal/journal-card";
import { MilestonesEditor } from "@/features/releases/milestones-editor";
import { ReleaseActions } from "@/features/releases/release-actions";
import { ReleaseForm } from "@/features/releases/release-form";
import { AddReleaseItemForm, RequiredToggle } from "@/features/releases/release-scope";
import { RiskListCard } from "@/features/risks/risk-list-card";
import { RemoveFromScopeButton } from "@/features/work-items/remove-from-scope-button";
import { loadOpenWorkItems } from "@/lib/api/options";
import { loadApi, requireMe, withQuery } from "@/lib/api/server";
import { healthStatus, releaseRequirement, releaseStatus, sprintStatus } from "@/lib/design-system/status";
import { formatBusinessDate, formatDateTime } from "@/lib/format";
import { flatParams } from "@/lib/search-params";

export const metadata: Metadata = { title: "Release · Tech Lead Hub" };

export default function ReleasePage({ params, searchParams }: PageProps<"/releases/[id]">) {
  return (
    <Suspense fallback={<DetailSkeleton />}>
      <ReleaseView params={params} searchParams={searchParams} />
    </Suspense>
  );
}

async function ReleaseView({ params, searchParams }: PageProps<"/releases/[id]">) {
  const { id } = await params;
  // Resultado da geração de sprints, repassado pelo cadastro.
  const query = flatParams(await searchParams);
  const generated = Number(query.generated);
  const skipped = Number(query.skipped ?? 0);
  const [release, me, projects, candidates, risks, journal] = await Promise.all([
    loadApi(`/releases/${id}`, releaseDetailSchema),
    requireMe(),
    loadApi("/projects", z.array(projectSchema)),
    loadOpenWorkItems(),
    loadApi(withQuery("/risks", { releaseId: id }), z.array(riskSchema)),
    loadApi(withQuery("/journal", { releaseId: id, pageSize: "20" }), paginatedSchema(journalEntrySchema)),
  ]);
  if (!release.ok && release.reason === "not_found") notFound();
  if (!release.ok || !me.ok || !projects.ok || !candidates.ok || !risks.ok || !journal.ok) return <ApiUnavailable />;
  const r = release.data;
  const timeZone = me.data.workspace.timezone;
  const open = r.status === "PLANNED" || r.status === "IN_PROGRESS";
  const inScope = new Set(r.items.map((i) => i.workItem.id));
  const { required, requiredDone, optional, optionalDone } = r.progress;

  return (
    <>
      <PageHeader
        eyebrow={<Link href="/releases" className="hover:underline">Releases</Link>}
        title={
          <span className="flex flex-wrap items-center gap-2">
            <ContextChip code={r.project.code} name={r.project.name} className="h-6 text-xs" />
            {r.name}
            <StatusBadge meta={releaseStatus[r.status]} size="sm" />
            {r.health && <StatusBadge meta={healthStatus[r.health]} size="sm" />}
          </span>
        }
        description={r.description ?? undefined}
        actions={
          <>
            <Link href={`/reports/releases/${r.id}`} className={buttonVariants({ variant: "outline" })}>
              <FileText aria-hidden />
              Relatório
            </Link>
            <ReleaseActions release={r} />
            <DeleteButton path={`/releases/${r.id}`} redirectTo="/releases" question="Excluir a release definitivamente? Marcos e escopo saem junto; as sprints ficam sem release." />
          </>
        }
      />

      {query.generated !== undefined && Number.isInteger(generated) && (
        <Alert tone={generated > 0 ? "success" : "warning"} title={`${generated} sprint(s) planejada(s) gerada(s) para os times do projeto`}>
          {skipped > 0
            ? `${skipped} período(s) pulado(s) porque o time já tinha sprint aberta nas mesmas datas.`
            : "Defina nome e objetivo de cada sprint ao iniciá-la."}
        </Alert>
      )}

      {r.health === "UNKNOWN" && (
        <Alert tone="info" title="Saúde indeterminada">
          Informe o prazo comprometido e a previsão para classificar a release (RN-012).
        </Alert>
      )}

      <div className="grid items-start gap-4 lg:grid-cols-[1fr_20rem]">
        <div className="flex min-w-0 flex-col gap-4">
          <Card>
            <CardHeader>
              <CardTitle>Escopo</CardTitle>
              <CardDescription>Itens de qualquer time (CA-008); um item pode estar em várias releases (RN-009).</CardDescription>
              <CardAction>
                <DomainTag domain="delivery" />
              </CardAction>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              {open && <AddReleaseItemForm releaseId={r.id} candidates={candidates.data.items.filter((i) => !inScope.has(i.id))} />}
              {r.items.length === 0 ? (
                <p className="text-xs text-muted-foreground">Nenhum item no escopo.</p>
              ) : (
                <ul className="flex flex-col divide-y divide-border">
                  {r.items.map((entry) => (
                    <li key={entry.membershipId} className="py-2.5">
                      <WorkItemRow
                        item={entry.workItem}
                        showProject={entry.workItem.project.id !== r.project.id}
                        aside={
                          <>
                            <StatusBadge
                              meta={releaseRequirement[entry.isRequired ? "REQUIRED" : "OPTIONAL"]}
                              size="sm"
                              variant="outline"
                            />
                            {open && (
                              <>
                                <RequiredToggle releaseId={r.id} workItemId={entry.workItem.id} isRequired={entry.isRequired} />
                                <RemoveFromScopeButton
                                  path={`/releases/${r.id}/items/${entry.workItem.id}/remove`}
                                  label={`Retirar ${entry.workItem.externalKey} da release`}
                                />
                              </>
                            )}
                          </>
                        }
                      />
                    </li>
                  ))}
                </ul>
              )}
              {r.removed.length > 0 && (
                <details className="text-xs">
                  <summary className="pressable cursor-pointer text-muted-foreground">
                    {r.removed.length} retirado(s) do escopo
                  </summary>
                  <ul className="mt-2 flex flex-col gap-1">
                    {r.removed.map((m) => (
                      <li key={m.membershipId} className="flex flex-wrap gap-2 text-muted-foreground">
                        <Link href={`/work-items/${m.workItem.id}`} className="font-mono hover:underline">
                          {m.workItem.externalKey}
                        </Link>
                        <span className="line-through">{m.workItem.title}</span>
                        <span className="tabular">{formatDateTime(m.removedAt, timeZone)}</span>
                      </li>
                    ))}
                  </ul>
                </details>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Dados da release</CardTitle>
              <CardDescription>Alterar compromisso ou previsão grava o histórico (§12.5).</CardDescription>
            </CardHeader>
            <CardContent>
              <ReleaseForm release={r} projects={projects.data} />
            </CardContent>
          </Card>
        </div>

        <div className="flex min-w-0 flex-col gap-4">
          <Card>
            <CardHeader>
              <CardTitle>Progresso</CardTitle>
              <CardDescription>Por contagem de itens; horas entram com as estimativas (Etapa 4).</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-3 text-sm">
              <DateDelta committed={r.committedDate} forecast={r.forecastDate} source="MANUAL" />
              <div className="flex flex-col gap-1.5">
                <span className="text-xs text-muted-foreground tabular">
                  Obrigatórios: {requiredDone}/{required}
                </span>
                <Progress value={requiredDone} max={Math.max(required, 1)} tone="delivery" label="Obrigatórios concluídos" />
                {optional > 0 && (
                  <span className="text-xs text-muted-foreground tabular">
                    Opcionais: {optionalDone}/{optional}
                  </span>
                )}
              </div>
              <div className="flex flex-wrap gap-1">
                {r.teams.length === 0 ? (
                  <span className="text-xs text-muted-foreground">Sem times executores definidos.</span>
                ) : (
                  r.teams.map((t) => <ContextChip key={t.id} code={t.code} name={t.name} />)
                )}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Sprints geradas</CardTitle>
              <CardDescription>
                {r.sprintLengthDays
                  ? `${r.sprintLengthDays} dias úteis cada, a partir de ${r.startDate ? formatBusinessDate(r.startDate) : "—"}.`
                  : "A release foi cadastrada sem calendário de sprints."}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {r.generatedSprints.length === 0 ? (
                <p className="text-xs text-muted-foreground">Nenhuma sprint gerada.</p>
              ) : (
                <ul className="flex flex-col divide-y divide-border">
                  {r.generatedSprints.map((sprint) => (
                    <li key={sprint.id} className="flex flex-wrap items-center gap-1.5 py-2 first:pt-0 last:pb-0">
                      <ContextChip code={sprint.team.code} name={sprint.team.name} />
                      <Link href={`/sprints/${sprint.id}`} className="min-w-0 text-sm font-medium break-words hover:underline">
                        {sprint.name}
                      </Link>
                      <StatusBadge meta={sprintStatus[sprint.status]} size="sm" variant="dot" />
                      <span className="text-2xs text-muted-foreground tabular">
                        {formatBusinessDate(sprint.startDate)} – {formatBusinessDate(sprint.endDate)}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Marcos</CardTitle>
            </CardHeader>
            <CardContent>
              <MilestonesEditor releaseId={r.id} milestones={r.milestones} />
            </CardContent>
          </Card>
          <RiskListCard
            risks={risks.data}
            newHref={`/risks/new?releaseId=${r.id}`}
            empty="Nenhum risco aberto ligado diretamente à release."
          />
          <Card>
            <CardHeader>
              <CardTitle>Evolução da previsão</CardTitle>
            </CardHeader>
            <CardContent>
              {r.forecastHistory.length === 0 ? (
                <p className="text-xs text-muted-foreground">Sem compromisso ou previsão registrados.</p>
              ) : (
                <ol className="flex flex-col divide-y divide-border text-xs">
                  {r.forecastHistory.map((h) => (
                    <li key={h.id} className="flex flex-col gap-0.5 py-1.5 first:pt-0 last:pb-0">
                      <span className="text-subtle-foreground tabular">{formatDateTime(h.changedAt, timeZone)}</span>
                      <span className="tabular">
                        Compromisso {h.committedDate ? formatBusinessDate(h.committedDate) : "—"} · Previsão{" "}
                        {h.forecastDate ? formatBusinessDate(h.forecastDate) : "—"}
                      </span>
                    </li>
                  ))}
                </ol>
              )}
            </CardContent>
          </Card>
          <JournalCard entries={journal.data.items} href={`/journal?releaseId=${r.id}`} />
          <Card>
            <CardHeader>
              <CardTitle>Histórico</CardTitle>
            </CardHeader>
            <CardContent>
              <HistoryList entries={r.history} timeZone={timeZone} statusMap={releaseStatus} />
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}
