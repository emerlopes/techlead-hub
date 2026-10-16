import { journalCategories, journalEntrySchema, journalListQuerySchema, paginatedSchema } from "@tlh/shared-contracts";
import { NotebookPen, Search } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { ApiUnavailable } from "@/components/app/api-unavailable";
import { ListSkeleton } from "@/components/app/page-skeletons";
import { PageHeader } from "@/components/app/page-header";
import { Alert } from "@/components/ui/alert";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Input, Select } from "@/components/ui/input";
import { Pagination } from "@/components/ui/pagination";
import { ContextBar, ContextBarSkeleton } from "@/features/context/context-bar";
import { readContext } from "@/features/context/context.server";
import { loadLinkOptions } from "@/features/context/link-options.server";
import { JournalEntryEditor } from "@/features/journal/journal-entry-editor";
import { JournalForm } from "@/features/journal/journal-form";
import { loadApi } from "@/lib/api/server";
import { journalCategory } from "@/lib/design-system/status";
import { flatParams, withQuery } from "@/lib/search-params";

export const metadata: Metadata = { title: "Diário de bordo · Tech Lead Hub" };

/** Filtros de um contexto específico (vindos dos atalhos "Ver e registrar"). */
const scopedKeys = ["sprintId", "releaseId", "workItemId", "riskId"] as const;
const linkKindOf = { sprintId: "sprints", releaseId: "releases", workItemId: "workItems", riskId: "risks" } as const;

export default function JournalPage({ searchParams }: PageProps<"/journal">) {
  return (
    <>
      <PageHeader
        title="Diário de bordo"
        description="Decisões, incidentes, bloqueios e conquistas para demos, retrospectivas e decisões futuras (§17). Relatórios só usam o que foi registrado aqui."
      />
      <Suspense fallback={<ContextBarSkeleton />}>
        <ContextSection />
      </Suspense>
      <Suspense fallback={<ListSkeleton rows={5} />}>
        <Journal searchParams={searchParams} />
      </Suspense>
    </>
  );
}

async function ContextSection() {
  return <ContextBar selected={await readContext()} />;
}

async function Journal({ searchParams }: Pick<PageProps<"/journal">, "searchParams">) {
  const params = flatParams(await searchParams);
  const context = await readContext();
  const parsed = journalListQuerySchema.safeParse({
    ...Object.fromEntries(Object.entries(params).filter(([, v]) => v)),
    ...context,
  });
  const query = parsed.success ? parsed.data : journalListQuerySchema.parse(context);
  const scoped = scopedKeys.find((key) => query[key]);
  const filters = {
    category: query.category,
    from: query.from,
    to: query.to,
    ...Object.fromEntries(scopedKeys.map((key) => [key, query[key]])),
  };
  const [entries, options] = await Promise.all([
    loadApi(withQuery("/journal", { ...filters, ...context, page: String(query.page) }), paginatedSchema(journalEntrySchema)),
    loadLinkOptions(),
  ]);
  if (!entries.ok || !options.ok) return <ApiUnavailable />;
  const preselected = {
    ...(scoped && query[scoped] && { [linkKindOf[scoped]]: [query[scoped]] }),
    ...(context.teamId && { teams: [context.teamId] }),
    ...(context.projectId && { projects: [context.projectId] }),
  };
  const items = entries.data.items;

  return (
    <div className="grid items-start gap-4 lg:grid-cols-[1fr_22rem]">
      <section aria-label="Linha do tempo" className="flex min-w-0 flex-col gap-3">
        {scoped && (
          <Alert
            tone="info"
            title="Mostrando um contexto específico"
            action={
              <Link href="/journal" className={buttonVariants({ variant: "ghost", size: "sm" })}>
                Ver tudo
              </Link>
            }
          />
        )}
        {items.length === 0 ? (
          <EmptyState
            icon={NotebookPen}
            title="Nenhum acontecimento registrado"
            description="Registre decisões, incidentes e aprendizados enquanto acontecem. O diário não inventa o que não foi registrado (§17.4)."
          />
        ) : (
          <Card>
            <CardContent className="pt-4">
              <ol>
                {items.map((entry, index) => (
                  <JournalEntryEditor key={entry.id} entry={entry} options={options.data} last={index === items.length - 1} />
                ))}
              </ol>
            </CardContent>
          </Card>
        )}
        <Pagination
          page={entries.data.page}
          pageSize={entries.data.pageSize}
          total={entries.data.total}
          hrefFor={(page) => withQuery("/journal", { ...filters, page: page > 1 ? String(page) : undefined })}
        />
      </section>

      <div className="flex min-w-0 flex-col gap-4 lg:sticky lg:top-20">
        <Card>
          <CardHeader>
            <CardTitle>Registrar acontecimento</CardTitle>
          </CardHeader>
          <CardContent>
            <JournalForm options={options.data} preselected={preselected} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Filtrar</CardTitle>
          </CardHeader>
          <CardContent>
            <form method="get" className="flex flex-col gap-2" aria-label="Filtros do diário">
              {scopedKeys.map((key) => query[key] && <input key={key} type="hidden" name={key} value={query[key]} />)}
              <Select name="category" defaultValue={query.category ?? ""} aria-label="Categoria">
                <option value="">Todas as categorias</option>
                {journalCategories.map((value) => (
                  <option key={value} value={value}>
                    {journalCategory[value].label}
                  </option>
                ))}
              </Select>
              <div className="grid grid-cols-2 gap-2">
                <Input name="from" type="date" defaultValue={query.from ?? ""} aria-label="De" />
                <Input name="to" type="date" defaultValue={query.to ?? ""} aria-label="Até" />
              </div>
              <Button type="submit" variant="secondary">
                <Search aria-hidden />
                Filtrar
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
