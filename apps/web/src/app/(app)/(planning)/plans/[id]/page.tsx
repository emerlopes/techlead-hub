import { executionPlanDetailSchema, type ExecutionPlanDetail } from "@tlh/shared-contracts";
import { ArrowRightLeft, CalendarRange, Clock, Gauge, Hourglass, Plus } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { ApiUnavailable } from "@/components/app/api-unavailable";
import { DetailSkeleton } from "@/components/app/page-skeletons";
import { PageHeader } from "@/components/app/page-header";
import { AllocationRow } from "@/components/domain/allocation-row";
import { ContextChip, DomainTag } from "@/components/domain/domain-tag";
import { ExecutionTimeline } from "@/components/domain/execution-timeline";
import { HistoryList } from "@/components/domain/history-list";
import { IssueList } from "@/components/domain/issue-list";
import { Kpi } from "@/components/domain/kpi";
import { StatusBadge } from "@/components/domain/status-badge";
import { Alert } from "@/components/ui/alert";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { loadCapacityOptions } from "@/features/capacity/options.server";
import { PlanActions } from "@/features/planning/plan-actions";
import { PlanForm } from "@/features/planning/plan-form";
import { PlanQueueEditor } from "@/features/planning/plan-queue-editor";
import { loadOpenWorkItems } from "@/lib/api/options";
import { loadApi, requireMe } from "@/lib/api/server";
import { executionMode, executionPlanStatus, planIssueType, redistributionPolicy } from "@/lib/design-system/status";
import { formatBusinessRange, formatHours } from "@/lib/format";
import { withQuery } from "@/lib/search-params";

export const metadata: Metadata = { title: "Plano de execução · Tech Lead Hub" };

export default function PlanPage({ params }: PageProps<"/plans/[id]">) {
  return (
    <Suspense fallback={<DetailSkeleton />}>
      <PlanView params={params} />
    </Suspense>
  );
}

async function PlanView({ params }: Pick<PageProps<"/plans/[id]">, "params">) {
  const { id } = await params;
  const [plan, me, options, workItems] = await Promise.all([
    loadApi(`/execution-plans/${id}`, executionPlanDetailSchema),
    requireMe(),
    loadCapacityOptions(),
    loadOpenWorkItems(),
  ]);
  if (!plan.ok && plan.reason === "not_found") notFound();
  if (!plan.ok || !me.ok || !options.ok || !workItems.ok) return <ApiUnavailable />;
  const p = plan.data;
  const timeZone = me.data.workspace.timezone;
  const candidates = workItems.data.items
    .filter((w) => !p.project || w.project.id === p.project.id)
    .map((w) => ({ id: w.id, externalKey: w.externalKey, title: w.title }));

  return (
    <>
      <PageHeader
        eyebrow={<Link href="/plans" className="hover:underline">Planos</Link>}
        title={
          <span className="flex flex-wrap items-center gap-2">
            <Link href={`/developers/${p.developer.id}`} className="hover:underline">
              {p.developer.name}
            </Link>
            <span className="text-muted-foreground">→</span>
            {p.project?.name ?? p.team?.name ?? "Contexto geral"}
            {p.team && <ContextChip code={p.team.code} name={p.team.name} />}
            {p.project && <ContextChip code={p.project.code} name={p.project.name} />}
          </span>
        }
        description={
          <span className="flex flex-wrap items-center gap-1.5">
            <StatusBadge meta={executionPlanStatus[p.status]} size="sm" />
            <StatusBadge meta={executionMode[p.executionMode]} size="sm" variant="outline" />
            {p.executionMode !== "SEQUENTIAL" && <span className="text-xs tabular">até {p.maxParallelItems} simultâneos</span>}
            <StatusBadge meta={redistributionPolicy[p.redistributionPolicy]} size="sm" variant="dot" />
            <span className="text-xs tabular">{formatBusinessRange(p.startDate, p.endDate)}</span>
          </span>
        }
        actions={<PlanActions plan={p} />}
      />

      {p.status === "DRAFT" && (
        <Alert tone="info" title="Rascunho">
          Projetado isolado, como se tivesse o contexto só para si. Ative para que a fila passe a consumir a capacidade.
        </Alert>
      )}
      {p.issues.length > 0 && (
        <Alert tone={p.issues.some((i) => i.type === "CAPACITY_CONFLICT") ? "danger" : "warning"} title="Pontos de atenção no plano">
          <IssueList issues={p.issues} catalog={planIssueType} withDescription className="mt-1" />
        </Alert>
      )}

      <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="flex min-w-0 flex-col gap-4">
          <Card>
            <CardHeader>
              <CardTitle>Fila de execução</CardTitle>
              <CardDescription>
                Ordem explícita (§22.5). Itens concluídos liberam capacidade (CA-012); bloqueados não consomem. Não interfere na sua fila
                de foco pessoal.
              </CardDescription>
              <CardAction>
                <DomainTag domain="capacity" />
              </CardAction>
            </CardHeader>
            <CardContent>
              <PlanQueueEditor key={p.version} plan={p} candidates={candidates} />
            </CardContent>
          </Card>
          <ProjectionCard plan={p} />
        </div>

        <div className="flex min-w-0 flex-col gap-4">
          <Card>
            <CardHeader>
              <CardTitle>Configuração</CardTitle>
              <CardDescription>Mudanças valem na próxima projeção e são auditadas.</CardDescription>
            </CardHeader>
            <CardContent>
              <PlanForm plan={p} options={options.data} />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Capacidade do contexto</CardTitle>
              <CardDescription>Alocações da pessoa com exatamente este time e projeto (§20). Não são esforço realizado.</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              {p.contextAllocations.length === 0 ? (
                <p className="text-xs text-muted-foreground">Nenhuma alocação neste contexto: a fila não tem capacidade para consumir.</p>
              ) : (
                <ul className="flex flex-col divide-y divide-border">
                  {p.contextAllocations.map((a) => (
                    <li key={a.allocation.id} className="py-2 first:pt-0 last:pb-0">
                      <AllocationRow allocation={a.allocation} hours={a.hours} showDeveloper={false} />
                    </li>
                  ))}
                </ul>
              )}
              <Link
                href={withQuery("/capacity/allocations/new", { developerId: p.developer.id, teamId: p.team?.id, projectId: p.project?.id })}
                className={buttonVariants({ variant: "outline", size: "sm" })}
              >
                <Plus aria-hidden />
                Alocar neste contexto
              </Link>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Histórico</CardTitle>
            </CardHeader>
            <CardContent>
              <HistoryList entries={p.history} timeZone={timeZone} statusMap={executionPlanStatus} />
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}

function ProjectionCard({ plan }: { plan: ExecutionPlanDetail }) {
  const projection = plan.projection;
  const completing = plan.items.filter((i) => i.projection?.state === "COMPLETES").length;
  const open = plan.items.filter((i) => i.projection?.state !== "DONE").length;
  // Capacidade ocupada por itens sem estimativa: está em uso, mas sem horas conhecidas (§3.4).
  const unknownHours = projection
    ? Math.round((projection.capacityHours - projection.plannedHours - projection.idleHours - projection.donatedHours + projection.receivedHours) * 100) / 100
    : 0;
  return (
    <Card>
      <CardHeader>
        <CardTitle>Projeção da execução</CardTitle>
        <CardDescription>
          De hoje ao fim do plano, derivada na leitura com todos os planos ativos. Não é previsão de entrega: o motor de previsão
          (com confiança e histórico) chega na Etapa 6.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {!projection ? (
          <EmptyState
            icon={CalendarRange}
            title={plan.status === "ARCHIVED" ? "Plano arquivado" : "Período encerrado"}
            description={plan.status === "ARCHIVED" ? "Planos arquivados não são projetados." : "O fim do plano já passou: ajuste o período para projetar."}
          />
        ) : (
          <>
            {!projection.complete && (
              <Alert tone="warning" title="Projeção incompleta">
                Há itens sem estimativa, bloqueados ou à espera de dependência sem previsão: eles não recebem datas inventadas (§3.4,
                CA-018).
              </Alert>
            )}
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <Kpi label="Capacidade do contexto" value={formatHours(projection.capacityHours)} icon={Gauge} tone="capacity" />
              <Kpi
                label="Planejado"
                value={formatHours(projection.plannedHours)}
                icon={Clock}
                tone="capacity"
                hint={unknownHours > 0.01 ? `+ ${formatHours(unknownHours)} em itens sem estimativa` : undefined}
              />
              <Kpi
                label="Ocioso"
                value={formatHours(projection.idleHours)}
                icon={Hourglass}
                tone={projection.idleHours > 0 ? "attention" : "neutral"}
                hint={redistributionPolicy[plan.redistributionPolicy].label}
              />
              <Kpi label="Concluem no período" value={`${completing} de ${open}`} icon={CalendarRange} tone="capacity" />
            </div>
            {(projection.receivedHours > 0 || projection.donatedHours > 0) && (
              <p className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                <ArrowRightLeft className="size-3.5" aria-hidden />
                Entre contextos: recebeu {formatHours(projection.receivedHours)} e cedeu {formatHours(projection.donatedHours)} (§23.3).
              </p>
            )}
            {plan.items.length === 0 || projection.days.length === 0 ? (
              <p className="text-xs text-muted-foreground">Adicione itens à fila para ver a execução dia a dia.</p>
            ) : (
              <ExecutionTimeline
                days={projection.days}
                capacityByDay={projection.capacityByDay}
                usedByDay={projection.usedByDay}
                rows={plan.items.map((i) => ({
                  id: i.id,
                  code: i.workItem.externalKey,
                  title: i.workItem.title,
                  href: `/work-items/${i.workItem.id}`,
                  state: i.projection?.state ?? "NOT_STARTED",
                  hoursByDay: i.projection?.hoursByDay ?? [],
                }))}
              />
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
