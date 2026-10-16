import {
  developerSchema,
  healthStatuses,
  paginatedSchema,
  workItemListQuerySchema,
  workItemSchema,
} from "@tlh/shared-contracts";
import { Plus, Search, Truck } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { z } from "zod";
import { ApiUnavailable } from "@/components/app/api-unavailable";
import { ListSkeleton } from "@/components/app/page-skeletons";
import { PageHeader } from "@/components/app/page-header";
import { WorkItemRow } from "@/components/domain/work-item-row";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Checkbox, Input, Label, Select } from "@/components/ui/input";
import { Pagination } from "@/components/ui/pagination";
import { SegmentedNav } from "@/components/ui/segmented-nav";
import { ContextBar, ContextBarSkeleton } from "@/features/context/context-bar";
import { readContext } from "@/features/context/context.server";
import { loadApi } from "@/lib/api/server";
import { healthStatus } from "@/lib/design-system/status";
import { flatParams, withQuery } from "@/lib/search-params";

export const metadata: Metadata = { title: "Entregas · Tech Lead Hub" };

const scopes = [
  { value: "open", label: "Abertas" },
  { value: "closed", label: "Encerradas" },
  { value: "all", label: "Todas" },
] as const;

export default function WorkItemsPage({ searchParams }: PageProps<"/work-items">) {
  return (
    <>
      <PageHeader
        title="Entregas"
        description="Histórias, bugs e tarefas das ferramentas externas acompanhados por time, projeto e pessoa (§13, §14)."
        actions={
          <Link href="/work-items/new" className={buttonVariants()}>
            <Plus aria-hidden />
            Novo item
          </Link>
        }
      />
      <Suspense fallback={<ContextBarSkeleton />}>
        <ContextSection />
      </Suspense>
      <Suspense fallback={<ListSkeleton rows={6} />}>
        <WorkItemList searchParams={searchParams} />
      </Suspense>
    </>
  );
}

async function ContextSection() {
  return <ContextBar selected={await readContext()} />;
}

async function WorkItemList({ searchParams }: Pick<PageProps<"/work-items">, "searchParams">) {
  const params = flatParams(await searchParams);
  const context = await readContext();
  const parsed = workItemListQuerySchema.safeParse({ ...params, ...context });
  const query = parsed.success ? parsed.data : workItemListQuerySchema.parse(context);
  const [result, developers] = await Promise.all([
    loadApi(
      withQuery("/work-items", {
        ...context,
        scope: query.scope,
        health: query.health,
        developerId: query.developerId,
        stale: query.stale ? "true" : undefined,
        q: query.q,
        page: String(query.page),
      }),
      paginatedSchema(workItemSchema),
    ),
    loadApi("/developers", z.array(developerSchema)),
  ]);
  if (!result.ok || !developers.ok) return <ApiUnavailable />;
  const filters = { scope: params.scope, health: params.health, developerId: params.developerId, stale: params.stale, q: params.q };
  const filtered = Boolean(query.health || query.developerId || query.stale || query.q || context.teamId || context.projectId);

  return (
    <section className="flex flex-col gap-3" aria-label="Itens acompanhados">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <SegmentedNav
          label="Situação"
          current={query.scope}
          items={scopes.map((s) => ({ ...s, href: withQuery("/work-items", { ...filters, scope: s.value === "open" ? undefined : s.value }) }))}
        />
        <form method="get" className="flex flex-wrap items-center gap-2" aria-label="Filtros">
          {params.scope && <input type="hidden" name="scope" value={params.scope} />}
          <Input name="q" defaultValue={query.q ?? ""} placeholder="Identificador ou título" aria-label="Buscar" className="w-44" />
          <Select name="health" defaultValue={query.health ?? ""} aria-label="Saúde" className="w-36">
            <option value="">Qualquer saúde</option>
            {healthStatuses.map((value) => (
              <option key={value} value={value}>
                {healthStatus[value].label}
              </option>
            ))}
          </Select>
          <Select name="developerId" defaultValue={query.developerId ?? ""} aria-label="Responsável" className="w-40">
            <option value="">Qualquer pessoa</option>
            {developers.data.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </Select>
          <span className="flex items-center gap-1.5">
            <Checkbox id="filter-stale" name="stale" value="true" defaultChecked={query.stale === true} />
            <Label htmlFor="filter-stale" className="font-normal">
              Desatualizados
            </Label>
          </span>
          <Button type="submit" variant="secondary">
            <Search aria-hidden />
            Filtrar
          </Button>
        </form>
      </div>

      {result.data.items.length === 0 ? (
        <EmptyState
          icon={Truck}
          title={filtered ? "Nada encontrado com esses filtros" : "Nenhum item acompanhado"}
          description={
            filtered
              ? "Ajuste os filtros ou limpe o contexto selecionado."
              : "Cadastre as histórias e bugs que você acompanha. A ferramenta externa continua sendo a fonte (§13.2)."
          }
          action={
            <Link href="/work-items/new" className={buttonVariants({ variant: "outline" })}>
              <Plus aria-hidden />
              Novo item
            </Link>
          }
        />
      ) : (
        <Card>
          <ul className="flex flex-col divide-y divide-border">
            {result.data.items.map((item) => (
              <li key={item.id} className="px-4 py-3">
                <WorkItemRow item={item} />
              </li>
            ))}
          </ul>
        </Card>
      )}
      <Pagination
        page={result.data.page}
        pageSize={result.data.pageSize}
        total={result.data.total}
        hrefFor={(page) => withQuery("/work-items", { ...filters, page: page > 1 ? String(page) : undefined })}
      />
    </section>
  );
}
