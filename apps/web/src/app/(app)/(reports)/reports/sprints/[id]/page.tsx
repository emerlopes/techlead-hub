import { sprintReportSchema } from "@tlh/shared-contracts";
import { CircleCheck, GitBranch, Hourglass, ListPlus, OctagonX, SquareArrowOutUpRight } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { ApiUnavailable } from "@/components/app/api-unavailable";
import { DetailSkeleton } from "@/components/app/page-skeletons";
import { PageHeader } from "@/components/app/page-header";
import { PrintButton } from "@/components/app/print-button";
import { ContextLoadView } from "@/components/domain/context-load";
import { ContextChip, DomainTag } from "@/components/domain/domain-tag";
import { Kpi } from "@/components/domain/kpi";
import { StatusBadge } from "@/components/domain/status-badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { JournalCard } from "@/features/journal/journal-card";
import { DraftGenerator } from "@/features/reports/draft-generator";
import { ReportItemsCard } from "@/features/reports/report-items-card";
import { RiskListCard } from "@/features/risks/risk-list-card";
import { loadApi, requireMe } from "@/lib/api/server";
import { scopeChangeKind, sprintExitReason, sprintStatus } from "@/lib/design-system/status";
import { formatBusinessRange, formatDate, formatDateTime } from "@/lib/format";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Relatório de sprint · Tech Lead Hub" };

export default function SprintReportPage({ params }: PageProps<"/reports/sprints/[id]">) {
  return (
    <Suspense fallback={<DetailSkeleton />}>
      <SprintReportView params={params} />
    </Suspense>
  );
}

async function SprintReportView({ params }: Pick<PageProps<"/reports/sprints/[id]">, "params">) {
  // Relatório é sempre do momento da consulta: nada dele entra na pré-renderização (idade das verificações, "gerado em").
  await connection();
  const { id } = await params;
  const [report, me] = await Promise.all([loadApi(`/reports/sprints/${id}`, sprintReportSchema), requireMe()]);
  if (!report.ok && report.reason === "not_found") notFound();
  if (!report.ok || !me.ok) return <ApiUnavailable />;
  const r = report.data;
  const s = r.sprint;
  const timeZone = me.data.workspace.timezone;
  const changes = r.summary.added + r.summary.movedIn + r.summary.removed + r.summary.movedOut;

  return (
    <>
      <PageHeader
        eyebrow={<Link href="/reports" className="hover:underline">Relatório de sprint</Link>}
        title={
          <span className="flex flex-wrap items-center gap-2">
            <ContextChip code={s.team.code} name={s.team.name} className="h-6 text-xs" />
            {s.name}
            <StatusBadge meta={sprintStatus[s.status]} size="sm" />
          </span>
        }
        description={
          <span className="tabular">
            {formatBusinessRange(s.startDate, s.endDate)}
            {s.release && <> · gerada por {s.release.name}</>}
            <span className="block text-foreground">{s.goal ?? "Sem objetivo registrado."}</span>
          </span>
        }
        actions={
          <>
            <Link href={`/sprints/${s.id}`} className={cn(buttonVariants({ variant: "outline" }), "print:hidden")}>
              <SquareArrowOutUpRight aria-hidden />
              Abrir sprint
            </Link>
            <PrintButton />
          </>
        }
      />
      <p className="-mt-3 text-xs text-muted-foreground">
        Gerado em {formatDateTime(r.generatedAt, timeZone)} a partir dos registros da sprint, do diário e dos riscos — nada é estimado
        para preencher lacunas (§3.4).
      </p>

      <section aria-label="Resumo" className="grid grid-cols-2 gap-3 md:grid-cols-5">
        <Kpi label="Escopo original" value={r.summary.original} icon={ListPlus} />
        <Kpi label="Alterações de escopo" value={changes} icon={GitBranch} tone={changes > 0 ? "attention" : "neutral"} />
        <Kpi label="Concluídos" value={r.completed.length} icon={CircleCheck} tone="success" />
        <Kpi label="Pendentes" value={r.pending.length} icon={Hourglass} tone="neutral" />
        <Kpi label="Bloqueados" value={r.blockedItems.length} icon={OctagonX} tone={r.blockedItems.length > 0 ? "blocked" : "neutral"} />
      </section>

      <div className="grid items-start gap-4 lg:grid-cols-[1fr_20rem]">
        <div className="flex min-w-0 flex-col gap-4">
          <ReportItemsCard
            title="Escopo original"
            description="Planejado antes do início, inclusive o que saiu depois (§11.5)."
            rows={r.originalScope.map((e) => ({
              key: e.membershipId,
              item: e.workItem,
              aside: e.exitReason && e.exitReason !== "COMPLETED" && e.exitReason !== "NOT_COMPLETED" && (
                <StatusBadge meta={sprintExitReason[e.exitReason]} size="sm" variant="dot" />
              ),
            }))}
            empty="Nenhum item planejado antes do início."
          />

          <Card className="break-inside-avoid">
            <CardHeader>
              <CardTitle>
                Alterações de escopo <span className="font-normal text-muted-foreground tabular">({r.scopeChanges.length})</span>
              </CardTitle>
              <CardDescription>Entradas e saídas durante a sprint, preservadas no histórico (RN-010).</CardDescription>
            </CardHeader>
            <CardContent>
              {r.scopeChanges.length === 0 ? (
                <p className="text-xs text-muted-foreground">Nenhuma alteração de escopo.</p>
              ) : (
                <ol className="flex flex-col divide-y divide-border">
                  {r.scopeChanges.map((c, index) => (
                    <li key={`${c.workItem.id}-${c.kind}-${index}`} className="flex flex-wrap items-center gap-2 py-2 first:pt-0 last:pb-0">
                      <StatusBadge meta={scopeChangeKind[c.kind]} size="sm" />
                      <Link href={`/work-items/${c.workItem.id}`} className="inline-flex min-w-0 items-baseline gap-1.5 hover:underline">
                        <span className="shrink-0 font-mono text-xs">{c.workItem.externalKey}</span>
                        <span className="text-sm break-words">{c.workItem.title}</span>
                      </Link>
                      <span className="ml-auto text-2xs text-subtle-foreground tabular">{formatDate(c.at, timeZone)}</span>
                    </li>
                  ))}
                </ol>
              )}
            </CardContent>
          </Card>

          <ReportItemsCard
            title="Entregas concluídas"
            description={s.status === "CLOSED" ? "Resultado registrado no encerramento (RN-011)." : "Itens do escopo com execução concluída."}
            rows={r.completed.map((e) => ({ key: e.membershipId, item: e.workItem }))}
            empty="Nenhuma entrega concluída."
          />
          <ReportItemsCard
            title="Pendências"
            description="Escopo final ainda não concluído; pode ser planejado em outra sprint (§11.6)."
            rows={r.pending.map((e) => ({ key: e.membershipId, item: e.workItem }))}
            empty="Nenhuma pendência."
          />

          <Card className="break-inside-avoid">
            <CardHeader>
              <CardTitle>Observações para retrospectiva e demo</CardTitle>
              <CardDescription>
                Rascunhos montados só com o que foi registrado: entregas, diário, riscos e mudanças de escopo (§31.4, §31.5).
              </CardDescription>
              <CardAction>
                <DomainTag domain="delivery" />
              </CardAction>
            </CardHeader>
            <CardContent>
              <DraftGenerator sprintId={s.id} />
            </CardContent>
          </Card>
        </div>

        <div className="flex min-w-0 flex-col gap-4">
          <Card className="break-inside-avoid">
            <CardHeader>
              <CardTitle>Capacidade e demanda</CardTitle>
              <CardDescription>Alocada ao time no período × esforço restante do escopo em aberto (§5.2.4).</CardDescription>
            </CardHeader>
            <CardContent>
              <ContextLoadView load={s.capacity} label="Capacidade planejada × demanda" dueLabel="está no escopo" />
            </CardContent>
          </Card>
          <RiskListCard title="Bloqueios" risks={r.impediments} empty="Nenhum impedimento no período." />
          {r.blockedItems.length > 0 && (
            <ReportItemsCard
              title="Itens bloqueados"
              rows={r.blockedItems.map((e) => ({ key: e.membershipId, item: e.workItem }))}
              empty=""
            />
          )}
          <RiskListCard title="Riscos" risks={r.risks} empty="Nenhum risco vigente no período." />
          <JournalCard
            title="Decisões"
            entries={r.decisions}
            href={`/journal?sprintId=${s.id}&category=TECH_DECISION`}
            empty="Nenhuma decisão técnica registrada."
          />
          <JournalCard
            title="Acontecimentos"
            entries={r.events}
            href={`/journal?sprintId=${s.id}`}
            description="Da sprint e dos itens dela no período (§17.3)."
            empty="Nenhum acontecimento registrado."
          />
        </div>
      </div>
    </>
  );
}
