import { sprintListQuerySchema, sprintSchema } from "@tlh/shared-contracts";
import { CalendarRange, Plus } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { z } from "zod";
import { ApiUnavailable } from "@/components/app/api-unavailable";
import { ListSkeleton } from "@/components/app/page-skeletons";
import { PageHeader } from "@/components/app/page-header";
import { SprintSummary } from "@/components/domain/sprint-summary";
import { buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { SegmentedNav } from "@/components/ui/segmented-nav";
import { ContextBar, ContextBarSkeleton } from "@/features/context/context-bar";
import { readContext } from "@/features/context/context.server";
import { loadApi } from "@/lib/api/server";
import { flatParams, withQuery } from "@/lib/search-params";

export const metadata: Metadata = { title: "Sprints · Tech Lead Hub" };

const filters = [
  { value: "", label: "Todas" },
  { value: "ACTIVE", label: "Ativas" },
  { value: "PLANNED", label: "Planejadas" },
  { value: "CLOSED", label: "Encerradas" },
] as const;

export default function SprintsPage({ searchParams }: PageProps<"/sprints">) {
  return (
    <>
      <PageHeader
        title="Sprints"
        description="Ciclos de execução de cada time. Uma sprint pode conter itens de vários projetos (RN-019)."
        actions={
          <Link href="/sprints/new" className={buttonVariants()}>
            <Plus aria-hidden />
            Nova sprint
          </Link>
        }
      />
      <Suspense fallback={<ContextBarSkeleton />}>
        <ContextSection />
      </Suspense>
      <Suspense fallback={<ListSkeleton />}>
        <SprintList searchParams={searchParams} />
      </Suspense>
    </>
  );
}

async function ContextSection() {
  return <ContextBar selected={await readContext()} />;
}

async function SprintList({ searchParams }: Pick<PageProps<"/sprints">, "searchParams">) {
  const params = flatParams(await searchParams);
  const parsed = sprintListQuerySchema.safeParse({ status: params.status || undefined });
  const status = parsed.success ? parsed.data.status : undefined;
  const context = await readContext();
  const result = await loadApi(withQuery("/sprints", { status, ...context }), z.array(sprintSchema));
  if (!result.ok) return <ApiUnavailable />;

  return (
    <section className="flex flex-col gap-3" aria-label="Sprints">
      <SegmentedNav
        label="Situação"
        current={status ?? ""}
        items={filters.map((f) => ({ ...f, href: withQuery("/sprints", { status: f.value || undefined }) }))}
      />
      {result.data.length === 0 ? (
        <EmptyState
          icon={CalendarRange}
          title="Nenhuma sprint por aqui"
          description="Crie a sprint do time, planeje os itens e acompanhe o escopo e as movimentações."
          action={
            <Link href="/sprints/new" className={buttonVariants({ variant: "outline" })}>
              <Plus aria-hidden />
              Nova sprint
            </Link>
          }
        />
      ) : (
        <Card>
          <ul className="flex flex-col divide-y divide-border">
            {result.data.map((sprint) => (
              <li key={sprint.id} className="px-4 py-3">
                <SprintSummary sprint={sprint} />
              </li>
            ))}
          </ul>
        </Card>
      )}
    </section>
  );
}
