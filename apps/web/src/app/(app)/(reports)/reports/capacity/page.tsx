import { type CapacityReport, capacityReportSchema, type ContextLoad } from "@tlh/shared-contracts";
import { Users } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { ApiUnavailable } from "@/components/app/api-unavailable";
import { ListSkeleton } from "@/components/app/page-skeletons";
import { PageHeader } from "@/components/app/page-header";
import { PrintButton } from "@/components/app/print-button";
import { AbsenceItem } from "@/components/domain/absence-item";
import { CapacityIssues } from "@/components/domain/capacity-issues";
import { ContextChip, DomainTag } from "@/components/domain/domain-tag";
import { StatusBadge } from "@/components/domain/status-badge";
import { Alert } from "@/components/ui/alert";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { CapacityTotals } from "@/features/capacity/capacity-totals";
import { PeriodFilter } from "@/features/capacity/period-filter";
import { readPeriodParams } from "@/features/capacity/period";
import { ContextBar, ContextBarSkeleton } from "@/features/context/context-bar";
import { readContext } from "@/features/context/context.server";
import { loadApi, requireMe, withQuery } from "@/lib/api/server";
import { requestToday } from "@/lib/today.server";
import { capacityLevel, capacityIssueType } from "@/lib/design-system/status";
import { formatAllocationValue, formatBusinessRange, formatDateTime, formatHours, formatPercent } from "@/lib/format";

export const metadata: Metadata = { title: "Relatório de capacidade · Tech Lead Hub" };

export default function CapacityReportPage({ searchParams }: PageProps<"/reports/capacity">) {
  return (
    <>
      <PageHeader
        title="Relatório de capacidade"
        description="Capacidade nominal e efetiva, alocações, demanda, sobrecarga, conflitos e ausências do período (§31.3). Indicadores de planejamento, nunca de desempenho (§10.4)."
        actions={<PrintButton />}
      />
      <Suspense fallback={<ContextBarSkeleton />}>
        <ContextSection />
      </Suspense>
      <Suspense fallback={<ListSkeleton rows={6} />}>
        <Report searchParams={searchParams} />
      </Suspense>
    </>
  );
}

async function ContextSection() {
  return (
    <div className="print:hidden">
      <ContextBar selected={await readContext()} />
    </div>
  );
}

async function Report({ searchParams }: Pick<PageProps<"/reports/capacity">, "searchParams">) {
  const query = readPeriodParams(await searchParams);
  const context = await readContext();
  const [me, result] = await Promise.all([
    requireMe(),
    loadApi(withQuery("/reports/capacity", { from: query.from, to: query.to, ...context }), capacityReportSchema),
  ]);
  if (!me.ok || !result.ok) return <ApiUnavailable />;
  const r = result.data;
  const timeZone = me.data.workspace.timezone;
  const withIssues = r.developers.filter((d) => d.issues.length > 0);

  return (
    <>
      <div className="print:hidden">
        <PeriodFilter path="/reports/capacity" period={r.period} today={await requestToday(timeZone)} />
      </div>
      {query.invalid && (
        <Alert tone="warning" title="Período inválido">
          Use um início anterior ao fim e no máximo 184 dias. Mostrando o período padrão.
        </Alert>
      )}
      <p className="-mt-3 text-xs text-muted-foreground tabular">
        Período {formatBusinessRange(r.period.from, r.period.to)} · gerado em {formatDateTime(r.generatedAt, timeZone)}. Cada pessoa é
        contada uma vez; times e projetos recebem só a parcela alocada a eles (RN-037).
      </p>

      <CapacityTotals totals={r.totals} period={r.period} conflicts={withIssues.length} />

      {r.developers.length === 0 ? (
        <EmptyState
          icon={Users}
          title="Ninguém no período"
          description="Cadastre pessoas, jornadas e alocações para calcular a capacidade."
        />
      ) : (
        <>
          <Card className="break-inside-avoid">
            <CardHeader>
              <CardTitle>Pessoas</CardTitle>
              <CardDescription>Capacidade efetiva = (jornada − indisponível) × fator de foco (§18.3).</CardDescription>
              <CardAction>
                <DomainTag domain="capacity" />
              </CardAction>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Pessoa</TableHead>
                    <TableHead className="text-right">Nominal</TableHead>
                    <TableHead className="text-right">Indisponível</TableHead>
                    <TableHead className="text-right">Efetiva</TableHead>
                    <TableHead className="text-right">Alocada</TableHead>
                    <TableHead className="text-right">Livre</TableHead>
                    <TableHead className="text-right">Excedente</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {r.developers.map(({ developer, summary }) => {
                    // Sem jornada a capacidade é desconhecida, não zero (§3.4).
                    const unknown = summary.scheduledDays === 0;
                    const hours = (value: number) => (unknown ? "—" : formatHours(value));
                    return (
                      <TableRow key={developer.id}>
                        <TableCell>
                          <Link href={`/developers/${developer.id}`} className="font-medium hover:underline">
                            {developer.name}
                          </Link>
                        </TableCell>
                        <TableCell className="text-right tabular">{hours(summary.nominalHours)}</TableCell>
                        <TableCell className="text-right tabular">{hours(summary.unavailableHours)}</TableCell>
                        <TableCell className="text-right tabular">{hours(summary.effectiveHours)}</TableCell>
                        <TableCell className="text-right tabular">{formatHours(summary.allocatedHours)}</TableCell>
                        <TableCell className="text-right tabular">{hours(summary.freeHours)}</TableCell>
                        <TableCell className={summary.overAllocatedHours > 0 ? "text-right font-medium text-danger-fg tabular" : "text-right tabular"}>
                          {formatHours(summary.overAllocatedHours)}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <Card className="break-inside-avoid">
            <CardHeader>
              <CardTitle>Alocações</CardTitle>
              <CardDescription>Horas de cada alocação no período, pela política de distribuição diária (§20, §56.2).</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Pessoa</TableHead>
                    <TableHead>Contexto</TableHead>
                    <TableHead>Alocação</TableHead>
                    <TableHead className="text-right">Horas no período</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {r.developers.flatMap(({ developer, allocations }) =>
                    allocations.map(({ allocation, hours }) => (
                      <TableRow key={allocation.id}>
                        <TableCell>{developer.name}</TableCell>
                        <TableCell>
                          <span className="flex flex-wrap items-center gap-1">
                            {allocation.team && <ContextChip code={allocation.team.code} name={allocation.team.name} />}
                            {allocation.project && <ContextChip code={allocation.project.code} name={allocation.project.name} />}
                            {!allocation.team && !allocation.project && (
                              <span className="text-xs text-muted-foreground">Reserva geral · {allocation.description}</span>
                            )}
                          </span>
                        </TableCell>
                        <TableCell className="tabular">{formatAllocationValue(allocation)}</TableCell>
                        <TableCell className="text-right tabular">{formatHours(hours)}</TableCell>
                      </TableRow>
                    )),
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </>
      )}

      <div className="grid items-start gap-4">
        <DemandCard title="Demanda por time" rows={r.teams.map((t) => ({ ref: t.team, load: t }))} empty="Nenhum time ativo." />
        <DemandCard title="Demanda por projeto" rows={r.projects.map((p) => ({ ref: p.project, load: p }))} empty="Nenhum projeto ativo." />
      </div>

      <div className="grid items-start gap-4 lg:grid-cols-2">
        <ConflictsCard developers={withIssues} />
        <Card className="break-inside-avoid">
          <CardHeader>
            <CardTitle>Ausências relevantes</CardTitle>
            <CardDescription>Feriados e ausências que reduzem a capacidade do período (RN-027).</CardDescription>
          </CardHeader>
          <CardContent>
            {r.absences.length === 0 ? (
              <p className="text-xs text-muted-foreground">Nenhuma ausência ou feriado no período.</p>
            ) : (
              <ul className="flex flex-col divide-y divide-border">
                {r.absences.map((a) => (
                  <li key={a.id} className="py-2.5 first:pt-0 last:pb-0">
                    <AbsenceItem absence={a} />
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}

/** Capacidade alocada × demanda que vence no período (§25.5); sem capacidade, sem percentual. */
function DemandCard({
  title,
  rows,
  empty,
}: {
  title: string;
  rows: { ref: { id: string; code: string; name: string }; load: ContextLoad }[];
  empty: string;
}) {
  return (
    <Card className="break-inside-avoid">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>
          Esforço restante dos itens abertos. A utilização usa só o que vence no período; itens sem estimativa contam à parte (§25.5, RN-039).
        </CardDescription>
      </CardHeader>
      <CardContent>
        {rows.length === 0 ? (
          <p className="text-xs text-muted-foreground">{empty}</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Contexto</TableHead>
                <TableHead className="text-right">Alocada</TableHead>
                <TableHead className="text-right">Vence no período</TableHead>
                <TableHead className="text-right">Depois ou sem data</TableHead>
                <TableHead className="text-right">Sem estimativa</TableHead>
                <TableHead>Utilização</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map(({ ref, load }) => (
                <TableRow key={ref.id}>
                  <TableCell>
                    <ContextChip code={ref.code} name={ref.name} />
                  </TableCell>
                  <TableCell className="text-right tabular">{formatHours(load.allocatedHours)}</TableCell>
                  <TableCell className="text-right tabular">{formatHours(load.demand.dueHours)}</TableCell>
                  <TableCell className="text-right tabular">{formatHours(load.demand.laterHours + load.demand.undatedHours)}</TableCell>
                  <TableCell className="text-right tabular">{load.demand.unestimatedItems}</TableCell>
                  <TableCell>
                    <span className="flex items-center gap-1.5">
                      <StatusBadge meta={capacityLevel[load.level]} size="sm" />
                      {load.utilization !== null && <span className="text-xs tabular">{formatPercent(load.utilization / 100)}</span>}
                    </span>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}

function ConflictsCard({ developers }: { developers: CapacityReport["developers"] }) {
  return (
    <Card className="break-inside-avoid">
      <CardHeader>
        <CardTitle>Sobrecarga e conflitos</CardTitle>
        <CardDescription>Inconsistências de alocação sinalizadas antes da previsão (§20.5). Não bloqueiam: o Tech Lead decide.</CardDescription>
      </CardHeader>
      <CardContent>
        {developers.length === 0 ? (
          <p className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">Nenhum conflito de alocação no período.</p>
        ) : (
          <ul className="flex flex-col divide-y divide-border">
            {developers.map((d) => (
              <li key={d.developer.id} className="flex flex-col gap-1.5 py-2.5 first:pt-0 last:pb-0">
                <span className="text-sm font-medium">{d.developer.name}</span>
                <CapacityIssues issues={d.issues} withDescription />
                {d.summary.overAllocatedHours > 0 && (
                  <span className="text-2xs text-muted-foreground tabular">
                    {capacityIssueType.OVER_ALLOCATED.label}: {formatHours(d.summary.overAllocatedHours)} além da capacidade efetiva
                  </span>
                )}
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
