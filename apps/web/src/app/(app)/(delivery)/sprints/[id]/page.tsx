import { journalEntrySchema, paginatedSchema, riskSchema, sprintDetailSchema, teamSchema } from "@tlh/shared-contracts";
import { CircleCheck, FileText, GitBranch, ListPlus, Undo2 } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { z } from "zod";
import { ApiUnavailable } from "@/components/app/api-unavailable";
import { DetailSkeleton } from "@/components/app/page-skeletons";
import { DeleteButton } from "@/components/app/delete-button";
import { PageHeader } from "@/components/app/page-header";
import { ContextLoadView } from "@/components/domain/context-load";
import { ContextChip, DomainTag } from "@/components/domain/domain-tag";
import { HistoryList } from "@/components/domain/history-list";
import { Kpi } from "@/components/domain/kpi";
import { StatusBadge } from "@/components/domain/status-badge";
import { WorkItemRow } from "@/components/domain/work-item-row";
import { Alert } from "@/components/ui/alert";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { JournalCard } from "@/features/journal/journal-card";
import { RiskListCard } from "@/features/risks/risk-list-card";
import { SprintActions, StartSprintForm } from "@/features/sprints/sprint-actions";
import { SprintForm } from "@/features/sprints/sprint-form";
import { AddSprintItemForm } from "@/features/sprints/sprint-scope";
import { RemoveFromScopeButton } from "@/features/work-items/remove-from-scope-button";
import { loadOpenWorkItems } from "@/lib/api/options";
import { loadApi, requireMe, withQuery } from "@/lib/api/server";
import { scopeType, sprintExitReason, sprintStatus } from "@/lib/design-system/status";
import { formatBusinessDate } from "@/lib/format";
import { atRequestTime } from "@/lib/today.server";

export const metadata: Metadata = { title: "Sprint · Tech Lead Hub" };

export default function SprintPage({ params }: PageProps<"/sprints/[id]">) {
  return (
    <Suspense fallback={<DetailSkeleton />}>
      <SprintView params={params} />
    </Suspense>
  );
}

async function SprintView({ params }: Pick<PageProps<"/sprints/[id]">, "params">) {
  await atRequestTime();
  const { id } = await params;
  const [sprint, me, teams, candidates, risks, journal] = await Promise.all([
    loadApi(`/sprints/${id}`, sprintDetailSchema),
    requireMe(),
    loadApi("/teams", z.array(teamSchema)),
    loadOpenWorkItems(),
    loadApi(withQuery("/risks", { sprintId: id }), z.array(riskSchema)),
    loadApi(withQuery("/journal", { sprintId: id, pageSize: "20" }), paginatedSchema(journalEntrySchema)),
  ]);
  if (!sprint.ok && sprint.reason === "not_found") notFound();
  if (!sprint.ok || !me.ok || !teams.ok || !candidates.ok || !risks.ok || !journal.ok) return <ApiUnavailable />;
  const s = sprint.data;
  const open = s.status === "PLANNED" || s.status === "ACTIVE";
  const inScope = new Set(s.items.map((i) => i.workItem.id));
  const summary = s.summary;

  return (
    <>
      <PageHeader
        eyebrow={<Link href="/sprints" className="hover:underline">Sprints</Link>}
        title={
          <span className="flex flex-wrap items-center gap-2">
            <ContextChip code={s.team.code} name={s.team.name} className="h-6 text-xs" />
            {s.name}
            <StatusBadge meta={sprintStatus[s.status]} size="sm" />
          </span>
        }
        description={
          <span className="tabular">
            {formatBusinessDate(s.startDate)} – {formatBusinessDate(s.endDate)}
            {s.goal && <span className="block text-foreground">{s.goal}</span>}
          </span>
        }
        actions={
          <>
            <Link href={`/reports/sprints/${s.id}`} className={buttonVariants({ variant: "outline" })}>
              <FileText aria-hidden />
              Relatório
            </Link>
            <SprintActions sprint={s} />
            <DeleteButton path={`/sprints/${s.id}`} redirectTo="/sprints" question="Excluir a sprint definitivamente? Os itens voltam a ficar fora de sprint." />
          </>
        }
      />

      {s.status === "PLANNED" && (
        <Card id="iniciar" className="scroll-mt-20">
          <CardHeader>
            <CardTitle>Iniciar sprint</CardTitle>
            <CardDescription>
              {s.release ? (
                <>
                  Gerada automaticamente pelo calendário de{" "}
                  <Link href={`/releases/${s.release.id}`} className="font-medium text-foreground hover:underline">
                    {s.release.name}
                  </Link>
                  , com nome provisório. Confirme o nome e defina o objetivo ao iniciar.
                </>
              ) : (
                "Confirme o nome e defina o objetivo. Itens planejados até aqui ficam como escopo original (§11.5)."
              )}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <StartSprintForm sprint={s} />
          </CardContent>
        </Card>
      )}
      {s.status === "CLOSED" && (
        <Alert tone="info" title="Sprint encerrada">
          O encerramento registrou o resultado de cada item, sem concluir histórias (RN-011). Pendentes podem ser
          planejados em outra sprint como remanejados.
        </Alert>
      )}

      <section aria-label="Resumo para retrospectiva" className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Kpi label="Escopo original" value={summary.original} icon={ListPlus} tone="neutral" hint={`${summary.added} adicionados depois`} />
        <Kpi label="Remanejados" value={summary.movedIn} icon={GitBranch} tone="info" hint={`${summary.movedOut} saíram para outra sprint`} />
        <Kpi label="Concluídos" value={summary.completed} icon={CircleCheck} tone="success" hint={`${summary.pending} pendentes`} />
        <Kpi label="Removidos" value={summary.removed} icon={Undo2} tone="neutral" />
      </section>

      <div className="grid items-start gap-4 lg:grid-cols-[1fr_20rem]">
        <div className="flex min-w-0 flex-col gap-4">
          <Card>
            <CardHeader>
              <CardTitle>Escopo</CardTitle>
              <CardDescription>
                {open
                  ? "Itens planejados agora entram como originais; após o início, como adicionados (§11.5)."
                  : "Escopo no momento do encerramento."}
              </CardDescription>
              <CardAction>
                <DomainTag domain="delivery" />
              </CardAction>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              {open && <AddSprintItemForm sprintId={s.id} candidates={candidates.data.items.filter((i) => !inScope.has(i.id))} />}
              {s.items.length === 0 ? (
                <p className="text-xs text-muted-foreground">Nenhum item no escopo.</p>
              ) : (
                <ul className="flex flex-col divide-y divide-border">
                  {s.items.map((entry) => (
                    <li key={entry.membershipId} className="py-2.5">
                      <WorkItemRow
                        item={entry.workItem}
                        aside={
                          <>
                            <StatusBadge meta={scopeType[entry.scopeType]} size="sm" variant="outline" />
                            {entry.exitReason && <StatusBadge meta={sprintExitReason[entry.exitReason]} size="sm" variant="dot" />}
                            {open && (
                              <RemoveFromScopeButton
                                path={`/sprints/${s.id}/items/${entry.workItem.id}/remove`}
                                label={`Retirar ${entry.workItem.externalKey} da sprint`}
                              />
                            )}
                          </>
                        }
                      />
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          {s.departed.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Saíram durante a sprint</CardTitle>
                <CardDescription>Removidos ou remanejados — preservados no histórico (RN-010).</CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="flex flex-col divide-y divide-border">
                  {s.departed.map((entry) => (
                    <li key={entry.membershipId} className="py-2.5">
                      <WorkItemRow
                        item={entry.workItem}
                        aside={entry.exitReason && <StatusBadge meta={sprintExitReason[entry.exitReason]} size="sm" variant="dot" />}
                      />
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle>Dados da sprint</CardTitle>
              <CardDescription>Alterações são auditadas e usam controle de versão.</CardDescription>
            </CardHeader>
            <CardContent>
              <SprintForm sprint={s} teams={teams.data} />
            </CardContent>
          </Card>
        </div>

        <div className="flex min-w-0 flex-col gap-4">
          <Card>
            <CardHeader>
              <CardTitle>Capacidade</CardTitle>
              <CardDescription>Alocada ao time no período da sprint × esforço restante do escopo em aberto (§5.2.4).</CardDescription>
              <CardAction>
                <DomainTag domain="capacity" />
              </CardAction>
            </CardHeader>
            <CardContent>
              <ContextLoadView load={s.capacity} label="Capacidade planejada × demanda" dueLabel="está no escopo" />
            </CardContent>
          </Card>
          <RiskListCard risks={risks.data} newHref={`/risks/new?sprintId=${s.id}`} empty="Nenhum risco aberto ligado à sprint." />
          <JournalCard
            entries={journal.data.items}
            href={`/journal?sprintId=${s.id}`}
            description="Continua disponível após o encerramento (§11.6)."
          />
          <Card>
            <CardHeader>
              <CardTitle>Histórico</CardTitle>
            </CardHeader>
            <CardContent>
              <HistoryList entries={s.history} timeZone={me.data.workspace.timezone} statusMap={sprintStatus} />
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}
