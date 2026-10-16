import { workScheduleSchema } from "@tlh/shared-contracts";
import { CalendarClock, Pencil } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { z } from "zod";
import { ApiUnavailable } from "@/components/app/api-unavailable";
import { ListSkeleton } from "@/components/app/page-skeletons";
import { PageHeader } from "@/components/app/page-header";
import { DomainTag } from "@/components/domain/domain-tag";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { ScheduleForm } from "@/features/capacity/schedule-form";
import { loadCapacityOptions } from "@/features/capacity/options.server";
import { requestToday } from "@/lib/today.server";
import { loadApi, requireMe } from "@/lib/api/server";
import { formatBusinessDate, formatHours, formatPercent } from "@/lib/format";
import { flatParams, withQuery } from "@/lib/search-params";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Jornadas · Tech Lead Hub" };

export default function SchedulesPage({ searchParams }: PageProps<"/capacity/schedules">) {
  return (
    <>
      <PageHeader
        title="Jornadas"
        description="Horas previstas por dia da semana e fator de foco de cada pessoa (§19.1). Mudanças preservam o histórico."
      />
      <Suspense fallback={<ListSkeleton />}>
        <Schedules searchParams={searchParams} />
      </Suspense>
    </>
  );
}

async function Schedules({ searchParams }: Pick<PageProps<"/capacity/schedules">, "searchParams">) {
  const params = flatParams(await searchParams);
  const [schedules, options, me] = await Promise.all([
    loadApi(withQuery("/capacity/schedules", { developerId: params.developerId }), z.array(workScheduleSchema)),
    loadCapacityOptions(),
    requireMe(),
  ]);
  if (!schedules.ok || !options.ok || !me.ok) return <ApiUnavailable />;
  const today = await requestToday(me.data.workspace.timezone);
  const editing = schedules.data.find((s) => s.id === params.edit);
  const withSchedule = new Set(schedules.data.map((s) => s.developer.id));
  const missing = options.data.developers.filter((d) => !withSchedule.has(d.id));

  const groups = new Map<string, typeof schedules.data>();
  for (const s of schedules.data) groups.set(s.developer.id, [...(groups.get(s.developer.id) ?? []), s]);

  return (
    <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
      <Card>
        <CardHeader>
          <CardTitle>{editing ? `Editar jornada de ${editing.developer.name}` : "Nova jornada"}</CardTitle>
          <CardDescription>
            {editing ? "Para mudar a partir de uma data, cadastre uma nova jornada: o histórico fica preservado." : "Sugestão: 8 h de segunda a sexta, 75% de foco."}
          </CardDescription>
          <CardAction>
            {editing ? (
              <Link href="/capacity/schedules" className={buttonVariants({ variant: "ghost", size: "sm" })}>
                Cancelar edição
              </Link>
            ) : (
              <DomainTag domain="capacity" />
            )}
          </CardAction>
        </CardHeader>
        <CardContent>
          <ScheduleForm
            schedule={editing}
            developers={options.data.developers}
            developerId={params.developerId}
            onDone={editing ? "/capacity/schedules" : undefined}
          />
        </CardContent>
      </Card>

      <section className="flex flex-col gap-3" aria-label="Jornadas cadastradas">
        {missing.length > 0 && (
          <p className="text-xs text-muted-foreground">
            Sem jornada (capacidade desconhecida): {missing.map((d) => d.label).join(", ")}.
          </p>
        )}
        {groups.size === 0 ? (
          <EmptyState icon={CalendarClock} title="Nenhuma jornada" description="Sem jornada a capacidade não é calculada — nunca é suposta (§3.4)." />
        ) : (
          [...groups.entries()].map(([developerId, list]) => (
            <Card key={developerId}>
              <CardHeader>
                <CardTitle>
                  <Link href={`/developers/${developerId}`} className="hover:underline">
                    {list[0]?.developer.name}
                  </Link>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="flex flex-col divide-y divide-border">
                  {list.map((s) => {
                    const current = s.validFrom <= today && (s.validUntil === null || s.validUntil >= today);
                    return (
                      <li key={s.id} className={cn("flex flex-wrap items-center gap-x-3 gap-y-1.5 py-2.5 first:pt-0 last:pb-0", !current && "text-muted-foreground")}>
                        <span className="text-xs tabular">
                          {formatBusinessDate(s.validFrom)} → {s.validUntil ? formatBusinessDate(s.validUntil) : "sem fim"}
                        </span>
                        {current && <span className="text-2xs font-semibold text-capacity-fg uppercase">Vigente</span>}
                        <span className="font-mono text-xs tabular" title="Seg a Dom">
                          {s.weeklyPattern.map((h) => String(h).replace(".", ",")).join(" · ")}
                        </span>
                        <span className="text-xs tabular">{formatHours(s.weeklyHours)}/semana</span>
                        <span className="text-xs tabular">foco {formatPercent(s.focusFactor)}</span>
                        <Link
                          href={withQuery("/capacity/schedules", { edit: s.id })}
                          aria-label={`Editar jornada de ${s.developer.name}`}
                          className={cn(buttonVariants({ variant: "ghost", size: "icon-sm" }), "ml-auto")}
                        >
                          <Pencil aria-hidden />
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </CardContent>
            </Card>
          ))
        )}
      </section>
    </div>
  );
}
