import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { z } from "zod";
import { ApiUnavailable } from "@/components/app/api-unavailable";
import { ListSkeleton } from "@/components/app/page-skeletons";
import { PageHeader } from "@/components/app/page-header";
import { Card, CardContent } from "@/components/ui/card";
import type { LinkSelection } from "@/features/context/link-options";
import { loadLinkOptions } from "@/features/context/link-options.server";
import { RiskForm } from "@/features/risks/risk-form";
import { flatParams } from "@/lib/search-params";

export const metadata: Metadata = { title: "Registrar risco · Tech Lead Hub" };

const uuid = z.uuid();
const pre = (value: string | undefined) => (uuid.safeParse(value).success && value ? [value] : undefined);

export default function NewRiskPage({ searchParams }: PageProps<"/risks/new">) {
  return (
    <>
      <PageHeader
        eyebrow={<Link href="/risks" className="hover:underline">Riscos</Link>}
        title="Registrar risco ou impedimento"
        description="Vincule às entregas, sprints, releases e contextos afetados (§16.2)."
      />
      <Card className="max-w-4xl">
        <CardContent className="pt-4">
          <Suspense fallback={<ListSkeleton rows={6} />}>
            <NewRisk searchParams={searchParams} />
          </Suspense>
        </CardContent>
      </Card>
    </>
  );
}

async function NewRisk({ searchParams }: Pick<PageProps<"/risks/new">, "searchParams">) {
  const params = flatParams(await searchParams);
  const options = await loadLinkOptions();
  if (!options.ok) return <ApiUnavailable />;
  // Atalhos "Registrar" de itens, sprints e releases chegam já vinculados.
  const preselected: LinkSelection = {
    workItems: pre(params.workItemId),
    sprints: pre(params.sprintId),
    releases: pre(params.releaseId),
  };
  return <RiskForm options={options.data} preselected={preselected} />;
}
