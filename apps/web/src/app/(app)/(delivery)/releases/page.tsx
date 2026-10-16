import { releaseListQuerySchema, releaseSchema } from "@tlh/shared-contracts";
import { Plus, Rocket } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { z } from "zod";
import { ApiUnavailable } from "@/components/app/api-unavailable";
import { ListSkeleton } from "@/components/app/page-skeletons";
import { PageHeader } from "@/components/app/page-header";
import { ReleaseSummary } from "@/components/domain/release-summary";
import { buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { SegmentedNav } from "@/components/ui/segmented-nav";
import { ContextBar, ContextBarSkeleton } from "@/features/context/context-bar";
import { readContext } from "@/features/context/context.server";
import { loadApi } from "@/lib/api/server";
import { flatParams, withQuery } from "@/lib/search-params";

export const metadata: Metadata = { title: "Releases · Tech Lead Hub" };

const filters = [
  { value: "", label: "Todas" },
  { value: "IN_PROGRESS", label: "Em andamento" },
  { value: "PLANNED", label: "Planejadas" },
  { value: "RELEASED", label: "Entregues" },
] as const;

export default function ReleasesPage({ searchParams }: PageProps<"/releases">) {
  return (
    <>
      <PageHeader
        title="Releases"
        description="Entregas planejadas por projeto, com prazo comprometido e previsão separados (§12)."
        actions={
          <Link href="/releases/new" className={buttonVariants()}>
            <Plus aria-hidden />
            Nova release
          </Link>
        }
      />
      <Suspense fallback={<ContextBarSkeleton />}>
        <ContextSection />
      </Suspense>
      <Suspense fallback={<ListSkeleton />}>
        <ReleaseList searchParams={searchParams} />
      </Suspense>
    </>
  );
}

async function ContextSection() {
  return <ContextBar selected={await readContext()} />;
}

async function ReleaseList({ searchParams }: Pick<PageProps<"/releases">, "searchParams">) {
  const params = flatParams(await searchParams);
  const parsed = releaseListQuerySchema.safeParse({ status: params.status || undefined });
  const status = parsed.success ? parsed.data.status : undefined;
  const context = await readContext();
  const result = await loadApi(withQuery("/releases", { status, ...context }), z.array(releaseSchema));
  if (!result.ok) return <ApiUnavailable />;

  return (
    <section className="flex flex-col gap-3" aria-label="Releases">
      <SegmentedNav
        label="Situação"
        current={status ?? ""}
        items={filters.map((f) => ({ ...f, href: withQuery("/releases", { status: f.value || undefined }) }))}
      />
      {result.data.length === 0 ? (
        <EmptyState
          icon={Rocket}
          title="Nenhuma release por aqui"
          description="Crie a release do projeto, defina o prazo comprometido e associe os itens de cada time."
          action={
            <Link href="/releases/new" className={buttonVariants({ variant: "outline" })}>
              <Plus aria-hidden />
              Nova release
            </Link>
          }
        />
      ) : (
        <Card>
          <ul className="flex flex-col divide-y divide-border">
            {result.data.map((release) => (
              <li key={release.id} className="px-4 py-3">
                <ReleaseSummary release={release} />
              </li>
            ))}
          </ul>
        </Card>
      )}
    </section>
  );
}
