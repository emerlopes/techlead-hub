import { DASHBOARD_LIST_LIMIT, type DashboardCapacity } from "@tlh/shared-contracts";
import { CalendarOff, CalendarX, Hourglass, Shuffle, TrendingUp, Users } from "lucide-react";
import Link from "next/link";
import { AbsenceItem } from "@/components/domain/absence-item";
import { CapacityIssues } from "@/components/domain/capacity-issues";
import { ContextLoadView } from "@/components/domain/context-load";
import { ContextChip, DomainTag } from "@/components/domain/domain-tag";
import { Kpi } from "@/components/domain/kpi";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { formatBusinessRange, formatHours } from "@/lib/format";

/**
 * Capacidade no dashboard (§5.2.7): times sobrecarregados, pessoas com alocação excessiva, capacidade
 * não alocada, conflitos entre projetos e ausências com impacto previsto. Só sinaliza — o Tech Lead
 * decide o que fazer (§3.5).
 */
export function CapacitySection({ data }: { data: DashboardCapacity }) {
  const period = formatBusinessRange(data.period.from, data.period.to);
  return (
    <>
      <section aria-label="Capacidade" className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi
          label="Times sobrecarregados"
          value={data.overloadedTeams.length}
          icon={TrendingUp}
          tone={data.overloadedTeams.length ? "danger" : "neutral"}
          hint={period}
        />
        <Kpi
          label="Pessoas acima da capacidade"
          value={data.overAllocatedDevelopers.length}
          icon={Users}
          tone={data.overAllocatedDevelopers.length ? "danger" : "neutral"}
        />
        <Kpi
          label="Capacidade não alocada"
          value={formatHours(data.unallocatedHours)}
          icon={Hourglass}
          tone={data.unallocatedHours > 0 ? "attention" : "neutral"}
          hint={`${data.developersWithFreeCapacity.length} pessoa(s) com folga`}
        />
        <Kpi
          label="Sem jornada"
          value={data.developersWithoutSchedule}
          icon={CalendarX}
          tone={data.developersWithoutSchedule ? "attention" : "neutral"}
          hint="Capacidade desconhecida"
        />
      </section>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Sobrecarga e conflitos</CardTitle>
            <CardDescription>{period}. Demanda acima da capacidade alocada e alocações acima da capacidade efetiva (CA-011).</CardDescription>
            <CardAction>
              <DomainTag domain="capacity" />
            </CardAction>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            {data.overloadedTeams.length === 0 && data.overAllocatedDevelopers.length === 0 ? (
              <p className="text-xs text-muted-foreground">Nenhum time sobrecarregado nem pessoa acima da capacidade.</p>
            ) : (
              <>
                {data.overloadedTeams.length > 0 && (
                  <ul className="flex flex-col divide-y divide-border">
                    {data.overloadedTeams.slice(0, DASHBOARD_LIST_LIMIT).map((t) => (
                      <li key={t.team.id} className="flex flex-col gap-2 py-2.5 first:pt-0 last:pb-0">
                        <Link href={`/teams/${t.team.id}`} className="flex items-center gap-2 text-sm font-medium hover:underline">
                          <ContextChip code={t.team.code} name={t.team.name} />
                          {t.team.name}
                        </Link>
                        <ContextLoadView load={t} />
                      </li>
                    ))}
                  </ul>
                )}
                {data.overAllocatedDevelopers.length > 0 && (
                  <ul className="flex flex-col gap-2">
                    {data.overAllocatedDevelopers.slice(0, DASHBOARD_LIST_LIMIT).map((d) => (
                      <li key={d.developer.id} className="flex flex-wrap items-center gap-2">
                        <Link href={`/developers/${d.developer.id}`} className="text-sm font-medium hover:underline">
                          {d.developer.name}
                        </Link>
                        <CapacityIssues issues={d.issues} />
                        <span className="ml-auto font-mono text-xs text-danger-fg tabular">+{formatHours(d.summary.overAllocatedHours)}</span>
                      </li>
                    ))}
                  </ul>
                )}
                {data.projectConflicts.length > 0 && (
                  <div className="flex flex-col gap-1.5">
                    <p className="inline-flex items-center gap-1.5 text-xs font-medium text-warning-fg">
                      <Shuffle className="size-3.5" aria-hidden />
                      Conflitos entre projetos
                    </p>
                    <ul className="flex flex-col gap-1.5">
                      {data.projectConflicts.map((c) => (
                        <li key={c.developer.id} className="flex flex-wrap items-center gap-1.5 text-xs">
                          <span className="font-medium">{c.developer.name}</span>
                          {c.projects.map((p) => (
                            <ContextChip key={p.id} code={p.code} name={p.name} />
                          ))}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Folga e ausências</CardTitle>
            <CardDescription>Capacidade efetiva ainda não alocada e ausências de quem tem alocação no período.</CardDescription>
            <CardAction>
              <Link href="/capacity" className={buttonVariants({ variant: "ghost", size: "sm" })}>
                Ver capacidade
              </Link>
            </CardAction>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            {data.developersWithFreeCapacity.length === 0 ? (
              <p className="text-xs text-muted-foreground">Ninguém com capacidade livre no período.</p>
            ) : (
              <ul className="flex flex-wrap gap-x-4 gap-y-1.5">
                {data.developersWithFreeCapacity.slice(0, DASHBOARD_LIST_LIMIT).map((d) => (
                  <li key={d.developer.id} className="text-xs">
                    <Link href={`/developers/${d.developer.id}`} className="font-medium hover:underline">
                      {d.developer.name}
                    </Link>{" "}
                    <span className="font-mono text-muted-foreground tabular">{formatHours(d.freeHours)}</span>
                  </li>
                ))}
              </ul>
            )}
            {data.absences.length === 0 ? (
              <p className="flex items-center gap-2 text-xs text-muted-foreground">
                <CalendarOff className="size-4" aria-hidden />
                Nenhuma ausência com impacto no período.
              </p>
            ) : (
              <ul className="flex flex-col divide-y divide-border">
                {data.absences.slice(0, DASHBOARD_LIST_LIMIT).map((a) => (
                  <li key={a.id} className="py-2 first:pt-0 last:pb-0">
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
