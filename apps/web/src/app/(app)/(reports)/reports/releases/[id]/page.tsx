import { type ReleaseChange, releaseReportSchema } from "@tlh/shared-contracts";
import { CircleCheck, Link2, ListChecks, ShieldAlert, SquareArrowOutUpRight } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { ApiUnavailable } from "@/components/app/api-unavailable";
import { DetailSkeleton } from "@/components/app/page-skeletons";
import { PageHeader } from "@/components/app/page-header";
import { PrintButton } from "@/components/app/print-button";
import { DateDelta } from "@/components/domain/date-delta";
import { ContextChip } from "@/components/domain/domain-tag";
import { JournalEntry } from "@/components/domain/journal-entry";
import { Kpi } from "@/components/domain/kpi";
import { StatusBadge } from "@/components/domain/status-badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { DependencyList } from "@/features/planning/dependency-list";
import { ReportItemsCard } from "@/features/reports/report-items-card";
import { RiskListCard } from "@/features/risks/risk-list-card";
import { loadApi, requireMe } from "@/lib/api/server";
import { healthStatus, releaseRequirement, releaseStatus } from "@/lib/design-system/status";
import { formatBusinessDate, formatDateTime } from "@/lib/format";
import { atRequestTime } from "@/lib/today.server";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Relatório de release · Tech Lead Hub" };

export default function ReleaseReportPage({ params }: PageProps<"/reports/releases/[id]">) {
  return (
    <Suspense fallback={<DetailSkeleton />}>
      <ReleaseReportView params={params} />
    </Suspense>
  );
}

async function ReleaseReportView({ params }: Pick<PageProps<"/reports/releases/[id]">, "params">) {
  await atRequestTime();
  const { id } = await params;
  const [report, me] = await Promise.all([loadApi(`/reports/releases/${id}`, releaseReportSchema), requireMe()]);
  if (!report.ok && report.reason === "not_found") notFound();
  if (!report.ok || !me.ok) return <ApiUnavailable />;
  const r = report.data;
  const rel = r.release;
  const { progress } = rel;
  const timeZone = me.data.workspace.timezone;
  const openDependencies = r.dependencies.filter((d) => d.state !== "RELEASED").length;

  return (
    <>
      <PageHeader
        eyebrow={<Link href="/reports" className="hover:underline">Relatório de release</Link>}
        title={
          <span className="flex flex-wrap items-center gap-2">
            <ContextChip code={rel.project.code} name={rel.project.name} className="h-6 text-xs" />
            {rel.name}
            <StatusBadge meta={releaseStatus[rel.status]} size="sm" />
            {rel.health && <StatusBadge meta={healthStatus[rel.health]} size="sm" variant="outline" />}
          </span>
        }
        description={rel.description ?? undefined}
        actions={
          <>
            <Link href={`/releases/${rel.id}`} className={cn(buttonVariants({ variant: "outline" }), "print:hidden")}>
              <SquareArrowOutUpRight aria-hidden />
              Abrir release
            </Link>
            <PrintButton />
          </>
        }
      />
      <p className="-mt-3 text-xs text-muted-foreground">Gerado em {formatDateTime(r.generatedAt, timeZone)}.</p>

      <section aria-label="Resumo" className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Kpi
          label="Obrigatórios concluídos"
          value={`${progress.requiredDone}/${progress.required}`}
          icon={CircleCheck}
          tone="delivery"
          hint={progress.requiredUnestimated > 0 ? `${progress.requiredUnestimated} sem estimativa` : undefined}
        />
        <Kpi label="Opcionais concluídos" value={`${progress.optionalDone}/${progress.optional}`} icon={ListChecks} />
        <Kpi label="Riscos abertos" value={r.risks.length} icon={ShieldAlert} tone={r.risks.length > 0 ? "warning" : "neutral"} />
        <Kpi label="Dependências pendentes" value={openDependencies} icon={Link2} tone={openDependencies > 0 ? "attention" : "neutral"} />
      </section>

      <div className="grid items-start gap-4 lg:grid-cols-[1fr_20rem]">
        <div className="flex min-w-0 flex-col gap-4">
          <ReportItemsCard
            title="Escopo obrigatório"
            description="Situação de cada entrega pelo acompanhamento (§14)."
            rows={r.required.map((i) => ({ key: i.membershipId, item: i.workItem }))}
            empty="Nenhum item obrigatório."
          />
          <ReportItemsCard
            title="Escopo opcional"
            rows={r.optional.map((i) => ({
              key: i.membershipId,
              item: i.workItem,
              aside: <StatusBadge meta={releaseRequirement.OPTIONAL} size="sm" variant="outline" />,
            }))}
            empty="Nenhum item opcional."
          />
          <Card className="break-inside-avoid">
            <CardHeader>
              <CardTitle>
                Dependências <span className="font-normal text-muted-foreground tabular">({r.dependencies.length})</span>
              </CardTitle>
              <CardDescription>O que as entregas do escopo esperam, dentro ou fora do hub (§24).</CardDescription>
            </CardHeader>
            <CardContent>
              {r.dependencies.length === 0 ? (
                <p className="text-xs text-muted-foreground">Nenhuma dependência registrada para o escopo.</p>
              ) : (
                <DependencyList dependencies={r.dependencies} readOnly />
              )}
            </CardContent>
          </Card>
          <Card className="break-inside-avoid">
            <CardHeader>
              <CardTitle>Principais mudanças</CardTitle>
              <CardDescription>Compromisso e previsão, retiradas de escopo e registros do diário da release.</CardDescription>
            </CardHeader>
            <CardContent>
              {r.changes.length === 0 ? (
                <p className="text-xs text-muted-foreground">Nenhuma mudança registrada.</p>
              ) : (
                <ol className="flex flex-col gap-3">
                  {r.changes.map((change, index) => (
                    <ChangeLine key={index} change={change} timeZone={timeZone} />
                  ))}
                </ol>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="flex min-w-0 flex-col gap-4">
          <Card className="break-inside-avoid">
            <CardHeader>
              <CardTitle>Compromisso e previsão</CardTitle>
              <CardDescription>Armazenados separadamente (§12.5); a previsão nunca é inventada (§3.4).</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-3 text-sm">
              {/* PEND-9-01: com a Etapa 6, mostrar também a previsão calculada, a confiança e o estado (obsoleta/em recálculo). */}
              <DateDelta committed={rel.committedDate} forecast={r.forecast?.date ?? null} source={r.forecast?.source ?? "MANUAL"} />
              <p className="text-xs text-muted-foreground">
                {r.forecast
                  ? `Previsão manual informada pelo Tech Lead${r.forecast.recordedAt ? ` em ${formatDateTime(r.forecast.recordedAt, timeZone)}` : ""}. Ainda não há previsão calculada com nível de confiança.`
                  : "Nenhuma previsão registrada. A previsão calculada ainda não está disponível."}
              </p>
              <div className="flex flex-col gap-1.5">
                <span className="text-xs text-muted-foreground tabular">
                  Obrigatórios: {progress.requiredDone}/{progress.required}
                </span>
                <Progress value={progress.requiredDone} max={Math.max(progress.required, 1)} tone="delivery" label="Obrigatórios concluídos" />
              </div>
            </CardContent>
          </Card>
          <Card className="break-inside-avoid">
            <CardHeader>
              <CardTitle>Times envolvidos</CardTitle>
              <CardDescription>Executores dos itens do escopo (CA-008).</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-1">
              {rel.teams.length === 0 ? (
                <span className="text-xs text-muted-foreground">Sem times executores definidos.</span>
              ) : (
                rel.teams.map((t) => <ContextChip key={t.id} code={t.code} name={t.name} />)
              )}
            </CardContent>
          </Card>
          <RiskListCard title="Riscos" risks={r.risks} empty="Nenhum risco aberto na release ou nos itens dela." />
        </div>
      </div>
    </>
  );
}

function ChangeLine({ change, timeZone }: { change: ReleaseChange; timeZone: string }) {
  if (change.kind === "JOURNAL") {
    const e = change.entry;
    // Sem a linha de ligação da linha do tempo: aqui os registros se intercalam com outras mudanças.
    return <JournalEntry category={e.category} date={formatBusinessDate(e.occurredOn)} description={e.description} last />;
  }
  return (
    <li className="flex flex-col gap-0.5 text-sm">
      <span className="text-2xs text-subtle-foreground tabular">{formatDateTime(change.at, timeZone)}</span>
      {change.kind === "FORECAST" ? (
        <span className="tabular">
          Compromisso {change.committedDate ? formatBusinessDate(change.committedDate) : "—"} · Previsão manual{" "}
          {change.forecastDate ? formatBusinessDate(change.forecastDate) : "—"}
        </span>
      ) : (
        <span className="flex flex-wrap items-baseline gap-1.5">
          Retirado do escopo:
          <Link href={`/work-items/${change.workItem.id}`} className="font-mono text-xs hover:underline">
            {change.workItem.externalKey}
          </Link>
          <span className="line-through text-muted-foreground">{change.workItem.title}</span>
          <StatusBadge meta={releaseRequirement[change.isRequired ? "REQUIRED" : "OPTIONAL"]} size="sm" variant="outline" />
        </span>
      )}
    </li>
  );
}
