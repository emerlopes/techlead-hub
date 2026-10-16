import { developerCapacityDetailSchema, projectDemandSchema, teamCapacitySchema } from "@tlh/shared-contracts";
import { CalendarOff, Plus } from "lucide-react";
import Link from "next/link";
import { ApiUnavailable } from "@/components/app/api-unavailable";
import { AbsenceItem } from "@/components/domain/absence-item";
import { AllocationRow } from "@/components/domain/allocation-row";
import { CapacityBar } from "@/components/domain/capacity-bar";
import { CapacityDays } from "@/components/domain/capacity-days";
import { CapacityIssues } from "@/components/domain/capacity-issues";
import { ConfidenceMeter } from "@/components/domain/confidence-meter";
import { ContextLoadView } from "@/components/domain/context-load";
import { ContextChip, DomainTag } from "@/components/domain/domain-tag";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/misc";
import { loadApi } from "@/lib/api/server";
import { formatBusinessDate, formatBusinessRange, formatHours, formatPercent } from "@/lib/format";
import { cn } from "@/lib/utils";

function Stat({ label, value, className }: { label: string; value: string; className?: string }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-2xs font-medium text-muted-foreground uppercase">{label}</span>
      <span className={cn("font-mono text-sm font-semibold tabular", className)}>{value}</span>
    </div>
  );
}

/** Disponibilidade e alocações de uma pessoa (§10.2, §36.5) nas próximas 2 semanas. */
export async function DeveloperCapacityCard({ developerId }: { developerId: string }) {
  const result = await loadApi(`/developers/${developerId}/capacity`, developerCapacityDetailSchema);
  if (!result.ok) return <ApiUnavailable />;
  const { summary, period, days, schedules, exceptions, allocations, issues } = result.data;
  const current = schedules.find((s) => s.validFrom <= period.to && (s.validUntil === null || s.validUntil >= period.from));

  return (
    <Card className="min-w-0 lg:col-span-2">
      <CardHeader>
        <CardTitle>Capacidade · {formatBusinessRange(period.from, period.to)}</CardTitle>
        <CardDescription>Indicador de planejamento, nunca de desempenho (§10.4). Times e projetos recebem só a parcela alocada.</CardDescription>
        <CardAction>
          <DomainTag domain="capacity" />
        </CardAction>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <CapacityIssues issues={issues} withDescription />
        {summary.scheduledDays === 0 ? (
          <p className="text-xs text-muted-foreground">
            Sem jornada no período: a capacidade não é calculada.{" "}
            <Link href={`/capacity/schedules?developerId=${developerId}`} className="font-medium text-foreground hover:underline">
              Cadastrar jornada
            </Link>
          </p>
        ) : (
          <>
            <div className="grid grid-cols-3 gap-3 sm:grid-cols-5">
              <Stat label="Nominal" value={formatHours(summary.nominalHours)} />
              <Stat label="Indisponível" value={formatHours(summary.unavailableHours)} />
              <Stat label="Efetiva" value={formatHours(summary.effectiveHours)} className="text-capacity-fg" />
              <Stat label="Alocada" value={formatHours(summary.allocatedHours)} />
              <Stat
                label={summary.overAllocatedHours > 0 ? "Excedente" : "Livre"}
                value={formatHours(summary.overAllocatedHours > 0 ? summary.overAllocatedHours : summary.freeHours)}
                className={summary.overAllocatedHours > 0 ? "text-danger-fg" : undefined}
              />
            </div>
            <CapacityBar label="Alocado × capacidade efetiva" demand={summary.allocatedHours} capacity={summary.effectiveHours} />
            <CapacityDays days={days} />
          </>
        )}

        <div className="grid gap-4 md:grid-cols-3">
          <div className="flex flex-col gap-2">
            <h3 className="text-2xs font-semibold tracking-wide text-muted-foreground uppercase">Jornada</h3>
            {current ? (
              <p className="text-xs">
                {formatHours(current.weeklyHours)}/semana · foco {formatPercent(current.focusFactor)}
                <span className="block text-2xs text-muted-foreground">desde {formatBusinessDate(current.validFrom)}</span>
              </p>
            ) : (
              <p className="text-xs text-muted-foreground">Sem jornada vigente.</p>
            )}
            <Link href={`/capacity/schedules?developerId=${developerId}`} className={cn(buttonVariants({ variant: "outline", size: "sm" }), "w-fit")}>
              Jornadas
            </Link>
          </div>
          <div className="flex flex-col gap-2">
            <h3 className="text-2xs font-semibold tracking-wide text-muted-foreground uppercase">Alocações no período</h3>
            {allocations.length === 0 ? (
              <p className="text-xs text-muted-foreground">Nenhuma alocação.</p>
            ) : (
              <ul className="flex flex-col gap-2">
                {allocations.map(({ allocation, hours }) => (
                  <li key={allocation.id}>
                    <AllocationRow allocation={allocation} hours={hours} showDeveloper={false} />
                  </li>
                ))}
              </ul>
            )}
            <Link href={`/capacity/allocations/new?developerId=${developerId}`} className={cn(buttonVariants({ variant: "outline", size: "sm" }), "w-fit")}>
              <Plus aria-hidden />
              Alocar
            </Link>
          </div>
          <div className="flex flex-col gap-2">
            <h3 className="text-2xs font-semibold tracking-wide text-muted-foreground uppercase">Ausências e feriados</h3>
            {exceptions.length === 0 ? (
              <p className="text-xs text-muted-foreground">Nenhuma no período.</p>
            ) : (
              <ul className="flex flex-col gap-2">
                {exceptions.map((e) => (
                  <li key={e.id}>
                    <AbsenceItem absence={e} showDeveloper={false} />
                  </li>
                ))}
              </ul>
            )}
            <Link href={`/capacity/availability?developerId=${developerId}`} className={cn(buttonVariants({ variant: "outline", size: "sm" }), "w-fit")}>
              <CalendarOff aria-hidden />
              Registrar ausência
            </Link>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

/** `GET /teams/{id}/capacity` (§36.10): capacidade alocada ao time × demanda das entregas dele. */
export async function TeamCapacityCard({ teamId }: { teamId: string }) {
  const result = await loadApi(`/teams/${teamId}/capacity`, teamCapacitySchema);
  if (!result.ok) return <ApiUnavailable />;
  const t = result.data;
  return (
    <Card className="min-w-0 lg:col-span-2">
      <CardHeader>
        <CardTitle>Capacidade · {formatBusinessRange(t.period.from, t.period.to)}</CardTitle>
        <CardDescription>Só a parcela alocada ao time conta aqui; a capacidade de quem participa de vários times não é duplicada (CA-021).</CardDescription>
        <CardAction>
          <Link href={`/capacity/allocations/new?teamId=${teamId}`} className={buttonVariants({ variant: "ghost", size: "sm" })}>
            <Plus aria-hidden />
            Alocar
          </Link>
        </CardAction>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <ContextLoadView load={t} label="Demanda × capacidade alocada" />
        {t.members.length === 0 ? (
          <p className="text-xs text-muted-foreground">Ninguém participa ou tem alocação no time.</p>
        ) : (
          <ul className="flex flex-col divide-y divide-border">
            {t.members.map((m) => (
              <li key={m.developer.id} className="flex flex-wrap items-center gap-x-3 gap-y-1.5 py-2.5 first:pt-0 last:pb-0">
                <Link href={`/developers/${m.developer.id}`} className="text-sm font-medium hover:underline">
                  {m.developer.name}
                </Link>
                {!m.isMember && <span className="text-2xs text-muted-foreground">sem participação no time</span>}
                <CapacityIssues issues={m.issues} />
                <span className="ml-auto text-xs text-muted-foreground tabular">
                  <span className="font-mono font-medium text-foreground">{formatHours(m.allocatedToTeamHours)}</span> de{" "}
                  {formatHours(m.summary.effectiveHours)} efetivas
                </span>
              </li>
            ))}
          </ul>
        )}
        {t.absences.length > 0 && (
          <div className="flex flex-col gap-2">
            <h3 className="text-2xs font-semibold tracking-wide text-muted-foreground uppercase">Ausências relevantes</h3>
            <ul className="flex flex-col gap-2">
              {t.absences.map((a) => (
                <li key={a.id}>
                  <AbsenceItem absence={a} />
                </li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

/** `GET /projects/{id}/demand` (§36.10): esforço restante × capacidade alocada, por time. */
export async function ProjectDemandCard({ projectId }: { projectId: string }) {
  const result = await loadApi(`/projects/${projectId}/demand`, projectDemandSchema);
  if (!result.ok) return <ApiUnavailable />;
  const p = result.data;
  return (
    <Card className="min-w-0 lg:col-span-2">
      <CardHeader>
        <CardTitle>Demanda · {formatBusinessRange(p.period.from, p.period.to)}</CardTitle>
        <CardDescription>Esforço restante dos itens abertos (concluídos não consomem capacidade, RN-035) × capacidade alocada ao projeto.</CardDescription>
        <CardAction>
          <Link href={`/capacity/allocations/new?projectId=${projectId}`} className={buttonVariants({ variant: "ghost", size: "sm" })}>
            <Plus aria-hidden />
            Alocar
          </Link>
        </CardAction>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <ContextLoadView load={p} label="Demanda × capacidade alocada" />
        {p.byTeam.length > 1 && (
          <ul className="flex flex-col gap-1.5">
            {p.byTeam.map((row) => (
              <li key={row.team?.id ?? "none"} className="flex flex-wrap items-center gap-2 text-xs">
                {row.team ? <ContextChip code={row.team.code} name={row.team.name} /> : <span className="text-muted-foreground">Sem time</span>}
                <span className="tabular">
                  {formatHours(row.demand.totalHours)} restantes · {formatHours(row.allocatedHours)} alocadas
                </span>
                {row.demand.unestimatedItems > 0 && <span className="text-attention-fg">{row.demand.unestimatedItems} sem estimativa</span>}
              </li>
            ))}
          </ul>
        )}
        {p.items.length === 0 ? (
          <p className="text-xs text-muted-foreground">Nenhum item aberto no projeto.</p>
        ) : (
          <ul className="flex flex-col divide-y divide-border">
            {p.items.slice(0, 10).map((item) => (
              <li key={item.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 py-2 first:pt-0 last:pb-0">
                <span className="font-mono text-2xs text-muted-foreground">{item.externalKey}</span>
                <Link href={`/work-items/${item.id}`} className="min-w-0 flex-1 truncate text-sm hover:underline">
                  {item.title}
                </Link>
                {item.executingTeam && <ContextChip code={item.executingTeam.code} name={item.executingTeam.name} />}
                {item.committedDate && <span className="text-2xs text-muted-foreground tabular">{formatBusinessDate(item.committedDate)}</span>}
                <ConfidenceMeter value={item.confidence} showLabel={false} />
                <span className={cn("font-mono text-xs tabular", item.remainingHours === null && "text-muted-foreground")}>
                  {item.remainingHours === null ? "sem estimativa" : formatHours(item.remainingHours)}
                </span>
              </li>
            ))}
            {p.items.length > 10 && (
              <li className="pt-2">
                <Link href={`/work-items?projectId=${projectId}`} className="text-xs font-medium hover:underline">
                  Ver todos os {p.items.length} itens abertos
                </Link>
              </li>
            )}
          </ul>
        )}
        {p.contributors.length > 0 && (
          <p className="text-xs text-muted-foreground">
            Capacidade alocada por: {p.contributors.map((c) => `${c.developer.name} (${formatHours(c.hours)})`).join(", ")}.
          </p>
        )}
      </CardContent>
    </Card>
  );
}

export function CapacityCardSkeleton() {
  return <Skeleton className="h-64 lg:col-span-2" />;
}
