import { availabilityExceptionSchema, exceptionListQuerySchema, exceptionScopes } from "@tlh/shared-contracts";
import { CalendarCheck } from "lucide-react";
import type { Metadata } from "next";
import { Suspense } from "react";
import { z } from "zod";
import { ApiUnavailable } from "@/components/app/api-unavailable";
import { ListSkeleton } from "@/components/app/page-skeletons";
import { PageHeader } from "@/components/app/page-header";
import { AbsenceItem } from "@/components/domain/absence-item";
import { DomainTag } from "@/components/domain/domain-tag";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { SegmentedNav } from "@/components/ui/segmented-nav";
import { CancelExceptionButton } from "@/features/capacity/cancel-exception-button";
import { ExceptionForm } from "@/features/capacity/exception-form";
import { loadCapacityOptions } from "@/features/capacity/options.server";
import { loadApi } from "@/lib/api/server";
import { flatParams, withQuery } from "@/lib/search-params";

export const metadata: Metadata = { title: "Ausências · Tech Lead Hub" };

const scopeLabels: Record<(typeof exceptionScopes)[number], string> = {
  upcoming: "Atuais e próximas",
  all: "Todas",
  cancelled: "Canceladas",
};

export default function AvailabilityPage({ searchParams }: PageProps<"/capacity/availability">) {
  return (
    <>
      <PageHeader
        title="Ausências e feriados"
        description="Indisponibilidades reduzem a capacidade efetiva (RN-027). Sobreposições são consolidadas: nada é descontado duas vezes (§18.4)."
      />
      <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
        <Card>
          <CardHeader>
            <CardTitle>Registrar</CardTitle>
            <CardDescription>Ausências mudam a capacidade na hora — e, a partir da Etapa 6, provocam recálculo das previsões (CA-015).</CardDescription>
            <CardAction>
              <DomainTag domain="capacity" />
            </CardAction>
          </CardHeader>
          <CardContent>
            <Suspense fallback={<ListSkeleton rows={4} />}>
              <NewException searchParams={searchParams} />
            </Suspense>
          </CardContent>
        </Card>
        <Suspense fallback={<ListSkeleton />}>
          <ExceptionList searchParams={searchParams} />
        </Suspense>
      </div>
    </>
  );
}

async function NewException({ searchParams }: Pick<PageProps<"/capacity/availability">, "searchParams">) {
  const params = flatParams(await searchParams);
  const options = await loadCapacityOptions();
  if (!options.ok) return <ApiUnavailable />;
  return <ExceptionForm developers={options.data.developers} developerId={params.developerId} />;
}

async function ExceptionList({ searchParams }: Pick<PageProps<"/capacity/availability">, "searchParams">) {
  const params = flatParams(await searchParams);
  const parsed = exceptionListQuerySchema.safeParse({ scope: params.scope || undefined, developerId: params.developerId || undefined });
  const query = parsed.success ? parsed.data : { scope: "upcoming" as const, developerId: undefined };
  const result = await loadApi(withQuery("/capacity/availability-exceptions", query), z.array(availabilityExceptionSchema));
  if (!result.ok) return <ApiUnavailable />;

  return (
    <section className="flex flex-col gap-3" aria-label="Ausências registradas">
      <SegmentedNav
        label="Situação"
        current={query.scope}
        items={exceptionScopes.map((scope) => ({
          value: scope,
          label: scopeLabels[scope],
          href: withQuery("/capacity/availability", { scope: scope === "upcoming" ? undefined : scope, developerId: query.developerId }),
        }))}
      />
      {result.data.length === 0 ? (
        <EmptyState icon={CalendarCheck} title="Nenhum registro" description="Sem ausências ou feriados nesta visão." />
      ) : (
        <Card>
          <ul className="flex flex-col divide-y divide-border">
            {result.data.map((a) => (
              <li key={a.id} className="px-4 py-3">
                <AbsenceItem absence={a} action={a.cancelledAt ? undefined : <CancelExceptionButton exception={a} />} />
              </li>
            ))}
          </ul>
        </Card>
      )}
    </section>
  );
}
