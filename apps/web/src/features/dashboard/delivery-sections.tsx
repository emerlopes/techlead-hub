import type { Dashboard, WorkItem } from "@tlh/shared-contracts";
import { CalendarClock, ClockAlert, History, MessageCircleQuestion, OctagonX, TriangleAlert } from "lucide-react";
import Link from "next/link";
import { DomainTag } from "@/components/domain/domain-tag";
import { Kpi } from "@/components/domain/kpi";
import { ReleaseSummary } from "@/components/domain/release-summary";
import { SprintSummary } from "@/components/domain/sprint-summary";
import { WorkItemRow } from "@/components/domain/work-item-row";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

type Deliveries = Dashboard["deliveries"];

const lists: { key: keyof Omit<Deliveries, "openCount">; label: string; empty: string }[] = [
  { key: "blocked", label: "Bloqueadas", empty: "Nenhuma entrega bloqueada." },
  { key: "delayed", label: "Atrasadas", empty: "Nenhuma entrega atrasada." },
  { key: "atRisk", label: "Em risco", empty: "Nenhuma entrega em risco." },
  { key: "forecastAfterCommitment", label: "Previsão após compromisso", empty: "Nenhuma previsão posterior ao compromisso." },
  { key: "stale", label: "Desatualizadas", empty: "Todos os acompanhamentos estão em dia." },
];

/**
 * Blocos de execução dos times no dashboard (§5.2.3–§5.2.6). Domínio separado das atividades
 * pessoais (§3.2); cada entrega aparece uma vez por lista, mesmo em várias releases (CA-010).
 */
export function DeliverySections({ data }: { data: Dashboard }) {
  const { deliveries, activeSprints, releases, refinement } = data;
  const first = lists.find((l) => deliveries[l.key].total > 0)?.key ?? "blocked";
  return (
    <>
      <section aria-label="Entregas críticas" className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi label="Entregas bloqueadas" value={deliveries.blocked.total} icon={OctagonX} tone={deliveries.blocked.total ? "blocked" : "neutral"} />
        <Kpi label="Entregas atrasadas" value={deliveries.delayed.total} icon={ClockAlert} tone={deliveries.delayed.total ? "danger" : "neutral"} />
        <Kpi label="Em risco" value={deliveries.atRisk.total} icon={TriangleAlert} tone={deliveries.atRisk.total ? "warning" : "neutral"} />
        <Kpi
          label="Desatualizadas"
          value={deliveries.stale.total}
          icon={History}
          tone={deliveries.stale.total ? "attention" : "neutral"}
          hint={`${deliveries.openCount} entregas abertas`}
        />
      </section>

      <Card>
        <CardHeader>
          <CardTitle>Entregas críticas</CardTitle>
          <CardDescription>O que pede ação nos times: bloqueios, atrasos, riscos e acompanhamentos sem verificação.</CardDescription>
          <CardAction>
            <DomainTag domain="delivery" />
          </CardAction>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue={first}>
            <TabsList className="max-w-full overflow-x-auto">
              {lists.map((l) => (
                <TabsTrigger key={l.key} value={l.key}>
                  {l.label}
                  <span className="font-mono text-2xs text-muted-foreground tabular">{deliveries[l.key].total}</span>
                </TabsTrigger>
              ))}
            </TabsList>
            {lists.map((l) => (
              <TabsContent key={l.key} value={l.key}>
                <WorkItemList items={deliveries[l.key].items} total={deliveries[l.key].total} empty={l.empty} />
              </TabsContent>
            ))}
          </Tabs>
        </CardContent>
      </Card>

      <div className="grid gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Sprints ativas</CardTitle>
            <CardDescription>Entregas, bloqueios, riscos e capacidade planejada × demanda estimada (§5.2.4).</CardDescription>
            <CardAction>
              <Link href="/sprints" className={buttonVariants({ variant: "ghost", size: "sm" })}>
                Ver sprints
              </Link>
            </CardAction>
          </CardHeader>
          <CardContent>
            {activeSprints.length === 0 ? (
              <p className="flex items-center gap-2 text-xs text-muted-foreground">
                <CalendarClock className="size-4" aria-hidden />
                Nenhuma sprint ativa no contexto.
              </p>
            ) : (
              <ul className="flex flex-col divide-y divide-border">
                {activeSprints.map((sprint) => (
                  <li key={sprint.id} className="py-2.5 first:pt-0 last:pb-0">
                    <SprintSummary sprint={sprint} />
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Refinamentos</CardTitle>
            <CardDescription>Preparação antes da execução (§5.2.6).</CardDescription>
            <CardAction>
              <Link href="/refinements" className={buttonVariants({ variant: "ghost", size: "sm" })}>
                Ver pipeline
              </Link>
            </CardAction>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <dl className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {[
                { label: "Aguardando", value: refinement.needsRefinement },
                { label: "Em análise", value: refinement.analyzing },
                { label: "Com dúvidas", value: refinement.waitingInformation },
                { label: "Checklist incompleto", value: refinement.checklistIncomplete },
              ].map((s) => (
                <div key={s.label} className="flex flex-col rounded-md border border-border px-2.5 py-2">
                  <dt className="text-2xs text-muted-foreground">{s.label}</dt>
                  <dd className="text-lg leading-tight font-semibold tabular">{s.value}</dd>
                </div>
              ))}
            </dl>
            {refinement.notReadyForImminentSprint.total > 0 ? (
              <div className="flex flex-col gap-2">
                <p className="inline-flex items-center gap-1.5 text-xs font-medium text-warning-fg">
                  <MessageCircleQuestion className="size-3.5" aria-hidden />
                  {refinement.notReadyForImminentSprint.total} não pronto(s) para sprint iminente
                </p>
                <WorkItemList
                  items={refinement.notReadyForImminentSprint.items.map((p) => p.workItem)}
                  total={refinement.notReadyForImminentSprint.total}
                  empty=""
                />
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">Nenhum item fora de prontidão para sprints iminentes.</p>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Releases</CardTitle>
          <CardDescription>Planejadas e em andamento. Uma release envolve vários times sem ser contada duas vezes.</CardDescription>
          <CardAction>
            <Link href="/releases" className={buttonVariants({ variant: "ghost", size: "sm" })}>
              Ver releases
            </Link>
          </CardAction>
        </CardHeader>
        <CardContent>
          {releases.length === 0 ? (
            <p className="text-xs text-muted-foreground">Nenhuma release em aberto no contexto.</p>
          ) : (
            <ul className="flex flex-col divide-y divide-border">
              {releases.map((release) => (
                <li key={release.id} className="py-2.5 first:pt-0 last:pb-0">
                  <ReleaseSummary release={release} />
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </>
  );
}

function WorkItemList({ items, total, empty }: { items: WorkItem[]; total: number; empty: string }) {
  if (items.length === 0) return <p className="text-xs text-muted-foreground">{empty}</p>;
  return (
    <div className="flex flex-col gap-2">
      <ul className="flex flex-col divide-y divide-border">
        {items.map((item) => (
          <li key={item.id} className="py-2.5 first:pt-0 last:pb-0">
            <WorkItemRow item={item} />
          </li>
        ))}
      </ul>
      {total > items.length && (
        <Link href="/work-items" className="text-xs text-primary hover:underline">
          Mais {total - items.length} em Entregas
        </Link>
      )}
    </div>
  );
}
