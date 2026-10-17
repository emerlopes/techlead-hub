import { addDays } from "@tlh/shared-contracts";
import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { ApiUnavailable } from "@/components/app/api-unavailable";
import { ListSkeleton } from "@/components/app/page-skeletons";
import { PageHeader } from "@/components/app/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { loadCapacityOptions } from "@/features/capacity/options.server";
import { PlanForm } from "@/features/planning/plan-form";
import { requireMe } from "@/lib/api/server";
import { flatParams } from "@/lib/search-params";
import { requestToday } from "@/lib/today.server";

export const metadata: Metadata = { title: "Novo plano · Tech Lead Hub" };

export default function NewPlanPage({ searchParams }: PageProps<"/plans/new">) {
  return (
    <>
      <PageHeader
        eyebrow={<Link href="/plans" className="hover:underline">Planos</Link>}
        title="Novo plano de execução"
        description="Um plano por pessoa e contexto. As alocações com o mesmo time e projeto alimentam a fila (§20, §22)."
      />
      <Card className="max-w-2xl">
        <CardContent className="pt-4">
          <Suspense fallback={<ListSkeleton rows={6} />}>
            <NewPlan searchParams={searchParams} />
          </Suspense>
        </CardContent>
      </Card>
    </>
  );
}

async function NewPlan({ searchParams }: Pick<PageProps<"/plans/new">, "searchParams">) {
  const params = flatParams(await searchParams);
  const [options, me] = await Promise.all([loadCapacityOptions(), requireMe()]);
  if (!options.ok || !me.ok) return <ApiUnavailable />;
  const today = await requestToday(me.data.workspace.timezone);
  // Sugestão: duas semanas a partir de hoje.
  return (
    <PlanForm
      options={options.data}
      defaults={{
        developerId: params.developerId,
        teamId: params.teamId,
        projectId: params.projectId,
        startDate: today,
        endDate: addDays(today, 13),
      }}
    />
  );
}
