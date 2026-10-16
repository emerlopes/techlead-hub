import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { ApiUnavailable } from "@/components/app/api-unavailable";
import { ListSkeleton } from "@/components/app/page-skeletons";
import { PageHeader } from "@/components/app/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { AllocationForm } from "@/features/capacity/allocation-form";
import { loadCapacityOptions } from "@/features/capacity/options.server";
import { flatParams } from "@/lib/search-params";

export const metadata: Metadata = { title: "Nova alocação · Tech Lead Hub" };

export default function NewAllocationPage({ searchParams }: PageProps<"/capacity/allocations/new">) {
  return (
    <>
      <PageHeader
        eyebrow={<Link href="/capacity/allocations" className="hover:underline">Alocações</Link>}
        title="Nova alocação"
        description="A soma pode passar da capacidade: o conflito é sinalizado, não bloqueado (§20.5)."
      />
      <Card className="max-w-2xl">
        <CardContent className="pt-4">
          <Suspense fallback={<ListSkeleton rows={5} />}>
            <NewAllocation searchParams={searchParams} />
          </Suspense>
        </CardContent>
      </Card>
    </>
  );
}

async function NewAllocation({ searchParams }: Pick<PageProps<"/capacity/allocations/new">, "searchParams">) {
  const params = flatParams(await searchParams);
  const options = await loadCapacityOptions();
  if (!options.ok) return <ApiUnavailable />;
  return (
    <AllocationForm
      options={options.data}
      defaults={{ developerId: params.developerId, teamId: params.teamId, projectId: params.projectId }}
    />
  );
}
