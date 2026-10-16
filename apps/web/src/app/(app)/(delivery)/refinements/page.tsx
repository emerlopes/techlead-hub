import {
  refinementPipelineItemSchema,
  type RefinementPipelineItem,
  type RefinementStatusValue,
  sprintSchema,
} from "@tlh/shared-contracts";
import { ClipboardList, Search, TriangleAlert } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { z } from "zod";
import { ApiUnavailable } from "@/components/app/api-unavailable";
import { ListSkeleton } from "@/components/app/page-skeletons";
import { PageHeader } from "@/components/app/page-header";
import { ContextChip } from "@/components/domain/domain-tag";
import { StatusBadge } from "@/components/domain/status-badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Select } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { ContextBar, ContextBarSkeleton } from "@/features/context/context-bar";
import { readContext } from "@/features/context/context.server";
import { loadApi } from "@/lib/api/server";
import { refinementStatus } from "@/lib/design-system/status";
import { formatBusinessDate } from "@/lib/format";
import { flatParams, withQuery } from "@/lib/search-params";

export const metadata: Metadata = { title: "Refinamentos · Tech Lead Hub" };

/** Colunas do pipeline (§15.2). Cancelados ficam fora da visão de trabalho. */
const columns: RefinementStatusValue[] = ["NEEDS_REFINEMENT", "ANALYZING", "WAITING_INFORMATION", "READY"];

export default function RefinementsPage({ searchParams }: PageProps<"/refinements">) {
  return (
    <>
      <PageHeader
        title="Refinamentos"
        description="Preparação dos itens antes da execução — independente da situação de execução (RN-007)."
      />
      <Suspense fallback={<ContextBarSkeleton />}>
        <ContextSection />
      </Suspense>
      <Suspense fallback={<ListSkeleton rows={4} />}>
        <Pipeline searchParams={searchParams} />
      </Suspense>
    </>
  );
}

async function ContextSection() {
  return <ContextBar selected={await readContext()} />;
}

async function Pipeline({ searchParams }: Pick<PageProps<"/refinements">, "searchParams">) {
  const params = flatParams(await searchParams);
  const sprintId = z.uuid().safeParse(params.sprintId).success ? params.sprintId : undefined;
  const context = await readContext();
  const [pipeline, sprints] = await Promise.all([
    loadApi(withQuery("/refinements", { ...context, sprintId }), z.array(refinementPipelineItemSchema)),
    loadApi("/sprints", z.array(sprintSchema)),
  ]);
  if (!pipeline.ok || !sprints.ok) return <ApiUnavailable />;
  const alerts = pipeline.data.filter((p) => p.notReadyForImminentSprint).length;
  const openSprints = sprints.data.filter((s) => s.status === "PLANNED" || s.status === "ACTIVE");

  return (
    <section className="flex flex-col gap-3" aria-label="Pipeline de refinamento">
      <div className="flex flex-wrap items-center justify-between gap-3">
        {alerts > 0 ? (
          <p className="inline-flex items-center gap-1.5 text-sm font-medium text-warning-fg">
            <TriangleAlert className="size-4" aria-hidden />
            {alerts} item(ns) não pronto(s) para sprint iminente (§15.5)
          </p>
        ) : (
          <span />
        )}
        <form method="get" className="flex items-center gap-2" aria-label="Filtrar por sprint">
          <Select name="sprintId" defaultValue={sprintId ?? ""} aria-label="Sprint" className="w-52">
            <option value="">Qualquer sprint</option>
            {openSprints.map((s) => (
              <option key={s.id} value={s.id}>
                {s.team.code} · {s.name}
              </option>
            ))}
          </Select>
          <Button type="submit" variant="secondary">
            <Search aria-hidden />
            Filtrar
          </Button>
        </form>
      </div>
      {pipeline.data.length === 0 ? (
        <EmptyState
          icon={ClipboardList}
          title="Nada para refinar"
          description="Itens com execução aberta aparecem aqui conforme a situação do refinamento."
        />
      ) : (
        <div className="grid items-start gap-3 md:grid-cols-2 xl:grid-cols-4">
          {columns.map((status) => {
            const items = pipeline.data.filter((p) => p.workItem.refinementStatus === status);
            return (
              <section key={status} aria-label={refinementStatus[status].label} className="flex min-w-0 flex-col gap-2">
                <header className="flex items-center justify-between gap-2">
                  <StatusBadge meta={refinementStatus[status]} size="sm" />
                  <span className="text-xs text-muted-foreground tabular">{items.length}</span>
                </header>
                {items.length === 0 ? (
                  <p className="rounded-lg border border-dashed border-border-strong px-3 py-4 text-center text-xs text-muted-foreground">
                    Vazio
                  </p>
                ) : (
                  items.map((item) => <PipelineCard key={item.workItem.id} item={item} />)
                )}
              </section>
            );
          })}
        </div>
      )}
    </section>
  );
}

function PipelineCard({ item }: { item: RefinementPipelineItem }) {
  const { workItem, checklist, intendedSprint } = item;
  const sprint = workItem.currentSprint ?? intendedSprint;
  return (
    <Card className="flex flex-col gap-2 p-3">
      <div className="flex min-w-0 items-start gap-2">
        <span className="mt-px shrink-0 font-mono text-xs text-muted-foreground">{workItem.externalKey}</span>
        <Link href={`/work-items/${workItem.id}`} className="min-w-0 text-sm font-medium break-words hover:underline">
          {workItem.title}
        </Link>
      </div>
      <div className="flex flex-wrap items-center gap-1.5">
        <ContextChip code={workItem.project.code} name={workItem.project.name} />
        {workItem.tracking.executingTeam && (
          <ContextChip code={workItem.tracking.executingTeam.code} name={workItem.tracking.executingTeam.name} />
        )}
        {sprint && (
          <span className="text-2xs text-muted-foreground tabular">
            {sprint.name} · {formatBusinessDate(sprint.startDate)}
          </span>
        )}
      </div>
      <div className="flex items-center gap-2">
        <Progress
          value={checklist.checked}
          max={Math.max(checklist.total, 1)}
          tone={checklist.checked === checklist.total ? "success" : "attention"}
          label="Checklist de prontidão"
        />
        <span className="shrink-0 text-2xs text-muted-foreground tabular">
          {checklist.checked}/{checklist.total}
        </span>
      </div>
      {item.openQuestions && <p className="line-clamp-2 text-xs text-muted-foreground">Dúvidas: {item.openQuestions}</p>}
      {item.notReadyForImminentSprint && (
        <span className="inline-flex items-center gap-1 text-2xs font-medium text-warning-fg">
          <TriangleAlert className="size-3" aria-hidden />
          Não pronto para sprint iminente
        </span>
      )}
      {item.suggestReady && <span className="text-2xs font-medium text-success-fg">Checklist completo: pode ficar pronto</span>}
    </Card>
  );
}
