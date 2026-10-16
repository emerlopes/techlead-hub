import { allocationListQuerySchema, allocationSchema } from "@tlh/shared-contracts";
import { Plus, Split } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { z } from "zod";
import { ApiUnavailable } from "@/components/app/api-unavailable";
import { ListSkeleton } from "@/components/app/page-skeletons";
import { PageHeader } from "@/components/app/page-header";
import { AllocationRow } from "@/components/domain/allocation-row";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { SegmentedNav } from "@/components/ui/segmented-nav";
import { ContextBar, ContextBarSkeleton } from "@/features/context/context-bar";
import { readContext } from "@/features/context/context.server";
import { loadApi } from "@/lib/api/server";
import { flatParams, withQuery } from "@/lib/search-params";

export const metadata: Metadata = { title: "Alocações · Tech Lead Hub" };

const scopes = [
  { value: "current", label: "Vigentes e futuras" },
  { value: "all", label: "Todas" },
] as const;

export default function AllocationsPage({ searchParams }: PageProps<"/capacity/allocations">) {
  return (
    <>
      <PageHeader
        title="Alocações"
        description="Parcela da capacidade efetiva reservada a times, projetos ou reservas gerais (§20). Não é esforço realizado (RN-036)."
        actions={
          <Link href="/capacity/allocations/new" className={buttonVariants()}>
            <Plus aria-hidden />
            Nova alocação
          </Link>
        }
      />
      <Suspense fallback={<ContextBarSkeleton />}>
        <ContextSection />
      </Suspense>
      <Suspense fallback={<ListSkeleton />}>
        <AllocationList searchParams={searchParams} />
      </Suspense>
    </>
  );
}

async function ContextSection() {
  return <ContextBar selected={await readContext()} />;
}

async function AllocationList({ searchParams }: Pick<PageProps<"/capacity/allocations">, "searchParams">) {
  const params = flatParams(await searchParams);
  const query = allocationListQuerySchema.parse({ scope: params.scope === "all" ? "all" : undefined, developerId: params.developerId || undefined });
  const context = await readContext();
  const result = await loadApi(withQuery("/capacity/allocations", { ...context, scope: query.scope, developerId: query.developerId }), z.array(allocationSchema));
  if (!result.ok) return <ApiUnavailable />;

  // Agrupadas por pessoa: a soma de cada pessoa é o que pode gerar conflito (§20.5).
  const groups = new Map<string, { name: string; items: typeof result.data }>();
  for (const a of result.data) {
    const group = groups.get(a.developer.id) ?? { name: a.developer.name, items: [] };
    group.items.push(a);
    groups.set(a.developer.id, group);
  }

  return (
    <section className="flex flex-col gap-3" aria-label="Alocações">
      <SegmentedNav
        label="Vigência"
        current={query.scope}
        items={scopes.map((s) => ({ ...s, href: withQuery("/capacity/allocations", { scope: s.value === "current" ? undefined : s.value, developerId: query.developerId }) }))}
      />
      {groups.size === 0 ? (
        <EmptyState
          icon={Split}
          title="Nenhuma alocação"
          description="Distribua a capacidade de cada pessoa entre times, projetos e reservas gerais."
          action={
            <Link href="/capacity/allocations/new" className={buttonVariants({ variant: "outline" })}>
              <Plus aria-hidden />
              Nova alocação
            </Link>
          }
        />
      ) : (
        <div className="grid items-start gap-4 lg:grid-cols-2">
          {[...groups.entries()].map(([developerId, group]) => (
            <Card key={developerId}>
              <CardHeader>
                <CardTitle>
                  <Link href={`/developers/${developerId}`} className="hover:underline">
                    {group.name}
                  </Link>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="flex flex-col divide-y divide-border">
                  {group.items.map((a) => (
                    <li key={a.id} className="py-2.5 first:pt-0 last:pb-0">
                      <AllocationRow allocation={a} showDeveloper={false} />
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
