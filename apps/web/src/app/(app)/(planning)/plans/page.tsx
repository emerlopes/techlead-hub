import { executionPlanSchema, planListQuerySchema, planScopes } from "@tlh/shared-contracts";
import { ListOrdered, Plus } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { z } from "zod";
import { ApiUnavailable } from "@/components/app/api-unavailable";
import { ListSkeleton } from "@/components/app/page-skeletons";
import { PageHeader } from "@/components/app/page-header";
import { ContextChip } from "@/components/domain/domain-tag";
import { StatusBadge } from "@/components/domain/status-badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { SegmentedNav } from "@/components/ui/segmented-nav";
import { ContextBar, ContextBarSkeleton } from "@/features/context/context-bar";
import { readContext } from "@/features/context/context.server";
import { loadApi } from "@/lib/api/server";
import { executionMode, executionPlanStatus, redistributionPolicy } from "@/lib/design-system/status";
import { formatBusinessRange } from "@/lib/format";
import { flatParams, withQuery } from "@/lib/search-params";

export const metadata: Metadata = { title: "Planos de execução · Tech Lead Hub" };

const scopeLabels: Record<(typeof planScopes)[number], string> = { current: "Ativos e rascunhos", archived: "Arquivados", all: "Todos" };

export default function PlansPage({ searchParams }: PageProps<"/plans">) {
  return (
    <>
      <PageHeader
        title="Planos de execução"
        description="Como cada pessoa consome a capacidade de um contexto: fila, paralelismo e redistribuição (§22, §23)."
        actions={
          <Link href="/plans/new" className={buttonVariants()}>
            <Plus aria-hidden />
            Novo plano
          </Link>
        }
      />
      <Suspense fallback={<ContextBarSkeleton />}>
        <ContextSection />
      </Suspense>
      <Suspense fallback={<ListSkeleton />}>
        <PlanList searchParams={searchParams} />
      </Suspense>
    </>
  );
}

async function ContextSection() {
  return <ContextBar selected={await readContext()} />;
}

async function PlanList({ searchParams }: Pick<PageProps<"/plans">, "searchParams">) {
  const params = flatParams(await searchParams);
  const query = planListQuerySchema.safeParse({ scope: params.scope, developerId: params.developerId || undefined });
  const { scope, developerId } = query.success ? query.data : { scope: "current" as const, developerId: undefined };
  const context = await readContext();
  const result = await loadApi(withQuery("/execution-plans", { ...context, scope, developerId }), z.array(executionPlanSchema));
  if (!result.ok) return <ApiUnavailable />;

  const groups = new Map<string, { name: string; plans: typeof result.data }>();
  for (const plan of result.data) {
    const group = groups.get(plan.developer.id) ?? { name: plan.developer.name, plans: [] };
    group.plans.push(plan);
    groups.set(plan.developer.id, group);
  }

  return (
    <section className="flex flex-col gap-3" aria-label="Planos">
      <SegmentedNav
        label="Situação"
        current={scope}
        items={planScopes.map((s) => ({
          value: s,
          label: scopeLabels[s],
          href: withQuery("/plans", { scope: s === "current" ? undefined : s, developerId }),
        }))}
      />
      {groups.size === 0 ? (
        <EmptyState
          icon={ListOrdered}
          title="Nenhum plano"
          description="Crie um plano por pessoa e contexto para ordenar a execução das entregas e ver como a capacidade será consumida."
          action={
            <Link href="/plans/new" className={buttonVariants({ variant: "outline" })}>
              <Plus aria-hidden />
              Novo plano
            </Link>
          }
        />
      ) : (
        <div className="grid items-start gap-4 lg:grid-cols-2">
          {[...groups.entries()].map(([id, group]) => (
            <Card key={id}>
              <CardHeader>
                <CardTitle>
                  <Link href={`/developers/${id}`} className="hover:underline">
                    {group.name}
                  </Link>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="flex flex-col divide-y divide-border">
                  {group.plans.map((p) => (
                    <li key={p.id} className="flex flex-col gap-1.5 py-2.5 first:pt-0 last:pb-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <Link href={`/plans/${p.id}`} className="text-sm font-medium hover:underline">
                          {p.project?.name ?? p.team?.name ?? "Contexto geral"}
                        </Link>
                        {p.team && <ContextChip code={p.team.code} name={p.team.name} />}
                        {p.project && <ContextChip code={p.project.code} name={p.project.name} />}
                        <StatusBadge meta={executionPlanStatus[p.status]} size="sm" className="ml-auto" />
                      </div>
                      <div className="flex flex-wrap items-center gap-1.5 text-2xs text-muted-foreground">
                        <StatusBadge meta={executionMode[p.executionMode]} size="sm" variant="outline" />
                        <StatusBadge meta={redistributionPolicy[p.redistributionPolicy]} size="sm" variant="dot" />
                        <span className="tabular">{formatBusinessRange(p.startDate, p.endDate)}</span>
                        <span className="tabular">
                          · {p.openItemCount} de {p.itemCount} {p.itemCount === 1 ? "item aberto" : "itens abertos"}
                        </span>
                      </div>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </section>
  );
}
