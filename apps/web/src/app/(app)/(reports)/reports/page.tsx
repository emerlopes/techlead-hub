import { releaseSchema, sprintSchema } from "@tlh/shared-contracts";
import { FileText, Gauge } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { z } from "zod";
import { ApiUnavailable } from "@/components/app/api-unavailable";
import { ListSkeleton } from "@/components/app/page-skeletons";
import { PageHeader } from "@/components/app/page-header";
import { ContextChip } from "@/components/domain/domain-tag";
import { StatusBadge } from "@/components/domain/status-badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { ContextBar, ContextBarSkeleton } from "@/features/context/context-bar";
import { readContext } from "@/features/context/context.server";
import { loadApi, withQuery } from "@/lib/api/server";
import { releaseStatus, sprintStatus } from "@/lib/design-system/status";
import { formatBusinessDate, formatBusinessRange } from "@/lib/format";

export const metadata: Metadata = { title: "Relatórios · Tech Lead Hub" };

export default function ReportsPage() {
  return (
    <>
      <PageHeader
        title="Relatórios"
        description="Consolidam o que já está registrado em sprints, releases, diário, riscos e capacidade (§31). Nenhum dado é inventado (§3.4)."
        actions={
          <Link href="/reports/capacity" className={buttonVariants({ variant: "outline" })}>
            <Gauge aria-hidden />
            Relatório de capacidade
          </Link>
        }
      />
      <Suspense fallback={<ContextBarSkeleton />}>
        <ContextSection />
      </Suspense>
      <Suspense fallback={<ListSkeleton rows={6} />}>
        <Lists />
      </Suspense>
    </>
  );
}

async function ContextSection() {
  return <ContextBar selected={await readContext()} />;
}

async function Lists() {
  const context = await readContext();
  const [sprints, releases] = await Promise.all([
    loadApi(withQuery("/sprints", context), z.array(sprintSchema)),
    loadApi(withQuery("/releases", context), z.array(releaseSchema)),
  ]);
  if (!sprints.ok || !releases.ok) return <ApiUnavailable />;
  // Sprints canceladas não têm resultado a relatar; continuam na própria página.
  const reportable = sprints.data.filter((s) => s.status !== "CANCELLED");

  return (
    <div className="grid items-start gap-4 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>Sprints</CardTitle>
          <CardDescription>Relatório da sprint (§31.1) e rascunhos de demo e retrospectiva (§31.4, §31.5).</CardDescription>
        </CardHeader>
        <CardContent>
          {reportable.length === 0 ? (
            <EmptyState icon={FileText} title="Nenhuma sprint" description="Crie uma sprint para acompanhar escopo, entregas e acontecimentos." />
          ) : (
            <ul className="flex flex-col divide-y divide-border">
              {reportable.map((s) => (
                <li key={s.id} className="flex flex-wrap items-center gap-2 py-2.5 first:pt-0 last:pb-0">
                  <ContextChip code={s.team.code} name={s.team.name} />
                  <Link href={`/reports/sprints/${s.id}`} className="min-w-0 text-sm font-medium break-words hover:underline">
                    {s.name}
                  </Link>
                  <StatusBadge meta={sprintStatus[s.status]} size="sm" variant="dot" />
                  <span className="ml-auto text-2xs text-muted-foreground tabular">{formatBusinessRange(s.startDate, s.endDate)}</span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Releases</CardTitle>
          <CardDescription>Compromisso, previsão, escopo, dependências, riscos e mudanças (§31.2).</CardDescription>
        </CardHeader>
        <CardContent>
          {releases.data.length === 0 ? (
            <EmptyState icon={FileText} title="Nenhuma release" description="Cadastre uma release para consolidar o escopo de um projeto." />
          ) : (
            <ul className="flex flex-col divide-y divide-border">
              {releases.data.map((r) => (
                <li key={r.id} className="flex flex-wrap items-center gap-2 py-2.5 first:pt-0 last:pb-0">
                  <ContextChip code={r.project.code} name={r.project.name} />
                  <Link href={`/reports/releases/${r.id}`} className="min-w-0 text-sm font-medium break-words hover:underline">
                    {r.name}
                  </Link>
                  <StatusBadge meta={releaseStatus[r.status]} size="sm" variant="dot" />
                  <span className="ml-auto text-2xs text-muted-foreground tabular">
                    {r.committedDate ? `Compromisso ${formatBusinessDate(r.committedDate)}` : "Sem compromisso"}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
