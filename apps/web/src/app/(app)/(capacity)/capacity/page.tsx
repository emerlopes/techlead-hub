import { capacityOverviewSchema } from "@tlh/shared-contracts";
import { CalendarOff, Clock, Gauge, Hourglass, Plus, TrendingUp, Users } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { ApiUnavailable } from "@/components/app/api-unavailable";
import { ListSkeleton } from "@/components/app/page-skeletons";
import { PageHeader } from "@/components/app/page-header";
import { AbsenceItem } from "@/components/domain/absence-item";
import { ContextLoadView } from "@/components/domain/context-load";
import { ContextChip, DomainTag } from "@/components/domain/domain-tag";
import { Kpi } from "@/components/domain/kpi";
import { Alert } from "@/components/ui/alert";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { DeveloperCapacityRow } from "@/features/capacity/developer-capacity-row";
import { PeriodFilter } from "@/features/capacity/period-filter";
import { readPeriodParams } from "@/features/capacity/period";
import { ContextBar, ContextBarSkeleton } from "@/features/context/context-bar";
import { readContext } from "@/features/context/context.server";
import { requestToday } from "@/lib/today.server";
import { loadApi, requireMe, withQuery } from "@/lib/api/server";
import { formatBusinessRange, formatHours } from "@/lib/format";

export const metadata: Metadata = { title: "Capacidade · Tech Lead Hub" };

export default function CapacityPage({ searchParams }: PageProps<"/capacity">) {
  return (
    <>
      <PageHeader
        title="Capacidade"
        description="Capacidade efetiva = (jornada − indisponível) × fator de foco (§18.3). Indicadores de planejamento, nunca de desempenho (§10.4)."
        actions={
          <>
            <Link href="/capacity/availability" className={buttonVariants({ variant: "outline" })}>
              <CalendarOff aria-hidden />
              Registrar ausência
            </Link>
            <Link href="/capacity/allocations/new" className={buttonVariants()}>
              <Plus aria-hidden />
              Nova alocação
            </Link>
          </>
        }
      />
      <Suspense fallback={<ContextBarSkeleton />}>
        <ContextSection />
      </Suspense>
      <Suspense fallback={<ListSkeleton rows={6} />}>
        <Overview searchParams={searchParams} />
      </Suspense>
    </>
  );
}

async function ContextSection() {
  return <ContextBar selected={await readContext()} />;
}

async function Overview({ searchParams }: Pick<PageProps<"/capacity">, "searchParams">) {
  const query = readPeriodParams(await searchParams);
  const context = await readContext();
  const [me, result] = await Promise.all([
    requireMe(),
    loadApi(withQuery("/capacity", { from: query.from, to: query.to, ...context }), capacityOverviewSchema),
  ]);
  if (!me.ok || !result.ok) return <ApiUnavailable />;
  const { period, totals, developers, teams, projects, absences } = result.data;
  const conflicts = developers.filter((d) => d.issues.length > 0).length;

  return (
    <>
      <PeriodFilter path="/capacity" period={period} today={await requestToday(me.data.workspace.timezone)} />
      {query.invalid && (
        <Alert tone="warning" title="Período inválido">
          Use um início anterior ao fim e no máximo 184 dias. Mostrando o período padrão.
        </Alert>
      )}

      <section aria-label="Totais do período" className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <Kpi label="Nominal" value={formatHours(totals.nominalHours)} icon={Clock} hint={formatBusinessRange(period.from, period.to)} />
        <Kpi label="Efetiva" value={formatHours(totals.effectiveHours)} icon={Gauge} tone="capacity" hint={`${formatHours(totals.unavailableHours)} indisponíveis`} />
        <Kpi label="Alocada" value={formatHours(totals.allocatedHours)} icon={Users} tone="capacity" />
        <Kpi label="Livre" value={formatHours(totals.freeHours)} icon={Hourglass} tone={totals.freeHours > 0 ? "attention" : "neutral"} hint="Capacidade não alocada" />
        <Kpi
          label="Sobrecarga"
          value={formatHours(totals.overAllocatedHours)}
          icon={TrendingUp}
          tone={totals.overAllocatedHours > 0 ? "danger" : "neutral"}
          hint={`${conflicts} pessoa(s) com inconsistência`}
        />
      </section>

      <div className="grid items-start gap-4 lg:grid-cols-2">
        <Card className="lg:row-span-2">
          <CardHeader>
            <CardTitle>Pessoas</CardTitle>
            <CardDescription>Capacidade global de cada pessoa: times e projetos recebem só a parcela alocada (CA-021).</CardDescription>
            <CardAction>
              <DomainTag domain="capacity" />
            </CardAction>
          </CardHeader>
          <CardContent>
            {developers.length === 0 ? (
              <EmptyState
                icon={Users}
                title="Ninguém no período"
                description="Cadastre pessoas, jornadas e alocações para calcular a capacidade."
                action={
                  <Link href="/capacity/schedules" className={buttonVariants({ variant: "outline" })}>
                    Cadastrar jornada
                  </Link>
                }
              />
            ) : (
              <ul className="flex flex-col divide-y divide-border">
                {developers.map((d) => (
                  <li key={d.developer.id} className="py-3 first:pt-0 last:pb-0">
                    <DeveloperCapacityRow capacity={d} />
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <LoadCard
          title="Times"
          description="Capacidade alocada ao time × esforço restante das entregas que ele executa (§25.5)."
          rows={teams.map((t) => ({ ref: t.team, href: `/teams/${t.team.id}`, load: t }))}
          empty="Nenhum time ativo."
        />
        <LoadCard
          title="Projetos"
          description="Capacidade alocada ao projeto × esforço restante dos itens dele (§36.10)."
          rows={projects.map((p) => ({ ref: p.project, href: `/projects/${p.project.id}`, load: p }))}
          empty="Nenhum projeto ativo."
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Ausências no período</CardTitle>
          <CardDescription>Feriados do workspace e ausências das pessoas da visão; reduzem a capacidade efetiva (RN-027).</CardDescription>
          <CardAction>
            <Link href="/capacity/availability" className={buttonVariants({ variant: "ghost", size: "sm" })}>
              Gerenciar
            </Link>
          </CardAction>
        </CardHeader>
        <CardContent>
          {absences.length === 0 ? (
            <p className="text-xs text-muted-foreground">Nenhuma ausência ou feriado no período.</p>
          ) : (
            <ul className="flex flex-col divide-y divide-border">
              {absences.map((a) => (
                <li key={a.id} className="py-2.5 first:pt-0 last:pb-0">
                  <AbsenceItem absence={a} />
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </>
  );
}

function LoadCard({
  title,
  description,
  rows,
  empty,
}: {
  title: string;
  description: string;
  rows: { ref: { id: string; code: string; name: string }; href: string; load: Parameters<typeof ContextLoadView>[0]["load"] }[];
  empty: string;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        {rows.length === 0 ? (
          <p className="text-xs text-muted-foreground">{empty}</p>
        ) : (
          <ul className="flex flex-col divide-y divide-border">
            {rows.map(({ ref, href, load }) => (
              <li key={ref.id} className="flex flex-col gap-2 py-3 first:pt-0 last:pb-0">
                <div className="flex items-center gap-2">
                  <ContextChip code={ref.code} name={ref.name} />
                  <Link href={href} className="min-w-0 truncate text-sm font-medium hover:underline">
                    {ref.name}
                  </Link>
                </div>
                <ContextLoadView load={load} />
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
