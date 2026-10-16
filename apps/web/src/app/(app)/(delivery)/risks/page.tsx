import { riskListQuerySchema, riskSchema, riskTypes } from "@tlh/shared-contracts";
import { Plus, ShieldCheck } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { z } from "zod";
import { ApiUnavailable } from "@/components/app/api-unavailable";
import { ListSkeleton } from "@/components/app/page-skeletons";
import { PageHeader } from "@/components/app/page-header";
import { LinkChips } from "@/components/domain/link-chips";
import { StatusBadge } from "@/components/domain/status-badge";
import { buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { SegmentedNav } from "@/components/ui/segmented-nav";
import { ContextBar, ContextBarSkeleton } from "@/features/context/context-bar";
import { readContext } from "@/features/context/context.server";
import { loadApi } from "@/lib/api/server";
import { blockingLevel, riskProbability, riskSeverity, riskStatus, riskType } from "@/lib/design-system/status";
import { formatBusinessDate } from "@/lib/format";
import { flatParams, withQuery } from "@/lib/search-params";

export const metadata: Metadata = { title: "Riscos · Tech Lead Hub" };

const scopes = [
  { value: "open", label: "Abertos" },
  { value: "closed", label: "Resolvidos e cancelados" },
  { value: "all", label: "Todos" },
] as const;

export default function RisksPage({ searchParams }: PageProps<"/risks">) {
  return (
    <>
      <PageHeader
        title="Riscos e impedimentos"
        description="Problemas atuais e potenciais que afetam entregas, sprints e releases (§16). Resolvidos continuam consultáveis (RN-008)."
        actions={
          <Link href="/risks/new" className={buttonVariants()}>
            <Plus aria-hidden />
            Registrar
          </Link>
        }
      />
      <Suspense fallback={<ContextBarSkeleton />}>
        <ContextSection />
      </Suspense>
      <Suspense fallback={<ListSkeleton />}>
        <RiskList searchParams={searchParams} />
      </Suspense>
    </>
  );
}

async function ContextSection() {
  return <ContextBar selected={await readContext()} />;
}

async function RiskList({ searchParams }: Pick<PageProps<"/risks">, "searchParams">) {
  const params = flatParams(await searchParams);
  const parsed = riskListQuerySchema.safeParse({ scope: params.scope, type: params.type || undefined });
  const query = parsed.success ? parsed.data : riskListQuerySchema.parse({});
  const context = await readContext();
  const result = await loadApi(withQuery("/risks", { scope: query.scope, type: query.type, ...context }), z.array(riskSchema));
  if (!result.ok) return <ApiUnavailable />;

  return (
    <section className="flex flex-col gap-3" aria-label="Riscos e impedimentos">
      <div className="flex flex-wrap gap-2">
        <SegmentedNav
          label="Situação"
          current={query.scope}
          items={scopes.map((s) => ({ ...s, href: withQuery("/risks", { scope: s.value === "open" ? undefined : s.value, type: query.type }) }))}
        />
        <SegmentedNav
          label="Tipo"
          current={query.type ?? ""}
          items={[{ value: "", label: "Riscos e impedimentos" }, ...riskTypes.map((t) => ({ value: t, label: riskType[t].label }))].map((t) => ({
            ...t,
            href: withQuery("/risks", { scope: params.scope, type: t.value || undefined }),
          }))}
        />
      </div>
      {result.data.length === 0 ? (
        <EmptyState
          icon={ShieldCheck}
          title={query.scope === "open" ? "Nenhum risco aberto" : "Nada encontrado"}
          description="Registre riscos e impedimentos e vincule às entregas, sprints e releases afetadas."
          action={
            <Link href="/risks/new" className={buttonVariants({ variant: "outline" })}>
              <Plus aria-hidden />
              Registrar
            </Link>
          }
        />
      ) : (
        <Card>
          <ul className="flex flex-col divide-y divide-border">
            {result.data.map((risk) => (
              <li key={risk.id} className="flex flex-col gap-1.5 px-4 py-3">
                <div className="flex flex-wrap items-center gap-2">
                  <StatusBadge meta={riskType[risk.type]} size="sm" />
                  <Link href={`/risks/${risk.id}`} className="min-w-0 text-sm font-medium break-words hover:underline">
                    {risk.title}
                  </Link>
                </div>
                <div className="flex flex-wrap items-center gap-1.5">
                  <StatusBadge meta={riskStatus[risk.status]} size="sm" variant="dot" />
                  <StatusBadge meta={riskSeverity[risk.severity]} size="sm" variant="outline" />
                  {risk.probability && <StatusBadge meta={riskProbability[risk.probability]} size="sm" variant="outline" />}
                  {risk.blockingLevel && <StatusBadge meta={blockingLevel[risk.blockingLevel]} size="sm" variant="outline" />}
                  <span className="text-2xs text-muted-foreground tabular">desde {formatBusinessDate(risk.identifiedAt)}</span>
                  {risk.owner && <span className="text-2xs text-muted-foreground">· {risk.owner}</span>}
                </div>
                <LinkChips links={risk.links} />
              </li>
            ))}
          </ul>
        </Card>
      )}
    </section>
  );
}
