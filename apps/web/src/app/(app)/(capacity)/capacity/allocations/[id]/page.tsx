import { allocationDetailSchema } from "@tlh/shared-contracts";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { ApiUnavailable } from "@/components/app/api-unavailable";
import { DetailSkeleton } from "@/components/app/page-skeletons";
import { PageHeader } from "@/components/app/page-header";
import { ContextChip, DomainTag } from "@/components/domain/domain-tag";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AllocationActions } from "@/features/capacity/allocation-actions";
import { AllocationForm } from "@/features/capacity/allocation-form";
import { loadCapacityOptions } from "@/features/capacity/options.server";
import { requestToday } from "@/lib/today.server";
import { loadApi, requireMe } from "@/lib/api/server";
import { formatAllocationValue, formatBusinessDate, formatDateTime } from "@/lib/format";
import { describeFields } from "@/lib/history-labels";

export const metadata: Metadata = { title: "Alocação · Tech Lead Hub" };

export default function AllocationPage({ params }: PageProps<"/capacity/allocations/[id]">) {
  return (
    <Suspense fallback={<DetailSkeleton />}>
      <AllocationView params={params} />
    </Suspense>
  );
}

async function AllocationView({ params }: Pick<PageProps<"/capacity/allocations/[id]">, "params">) {
  const { id } = await params;
  const [allocation, me, options] = await Promise.all([
    loadApi(`/capacity/allocations/${id}`, allocationDetailSchema),
    requireMe(),
    loadCapacityOptions(),
  ]);
  if (!allocation.ok && allocation.reason === "not_found") notFound();
  if (!allocation.ok || !me.ok || !options.ok) return <ApiUnavailable />;
  const a = allocation.data;
  const timeZone = me.data.workspace.timezone;
  const target = a.project?.name ?? a.team?.name ?? "Reserva geral";

  return (
    <>
      <PageHeader
        eyebrow={<Link href="/capacity/allocations" className="hover:underline">Alocações</Link>}
        title={
          <span className="flex flex-wrap items-center gap-2">
            <Link href={`/developers/${a.developer.id}`} className="hover:underline">
              {a.developer.name}
            </Link>
            <span className="text-muted-foreground">→</span>
            {target}
            <span className="font-mono text-base text-muted-foreground tabular">{formatAllocationValue(a)}</span>
          </span>
        }
        description={a.active ? "Vigente hoje." : "Fora da vigência hoje."}
        actions={<AllocationActions allocation={a} today={await requestToday(timeZone)} />}
      />
      <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <Card>
          <CardHeader>
            <CardTitle>Alocação</CardTitle>
            <CardDescription>Cada alteração guarda uma fotografia no histórico e é auditada (RN-038).</CardDescription>
            <CardAction>
              <DomainTag domain="capacity" />
            </CardAction>
          </CardHeader>
          <CardContent>
            <AllocationForm allocation={a} options={options.data} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Histórico</CardTitle>
            <CardDescription>Da mais recente para a mais antiga (§20.5).</CardDescription>
          </CardHeader>
          <CardContent>
            <ol className="flex flex-col divide-y divide-border">
              {a.history.map((h) => (
                <li key={h.id} className="flex flex-col gap-1 py-2.5 first:pt-0 last:pb-0">
                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    <span className="font-mono tabular">{formatAllocationValue(h)}</span>
                    {h.team && <ContextChip code={h.team.code} name={h.team.name} />}
                    {h.project && <ContextChip code={h.project.code} name={h.project.name} />}
                    <span className="text-muted-foreground tabular">
                      {formatBusinessDate(h.validFrom)} → {h.validUntil ? formatBusinessDate(h.validUntil) : "sem fim"}
                    </span>
                  </div>
                  <p className="text-2xs text-muted-foreground">
                    {formatDateTime(h.changedAt, timeZone)} ·{" "}
                    {h.changedFields.includes("created") ? "Criada" : `Alterado: ${describeFields(h.changedFields)}`}
                  </p>
                </li>
              ))}
            </ol>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
