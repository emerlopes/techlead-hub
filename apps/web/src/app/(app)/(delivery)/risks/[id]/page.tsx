import { journalEntrySchema, paginatedSchema, riskDetailSchema } from "@tlh/shared-contracts";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { ApiUnavailable } from "@/components/app/api-unavailable";
import { DetailSkeleton } from "@/components/app/page-skeletons";
import { DeleteButton } from "@/components/app/delete-button";
import { PageHeader } from "@/components/app/page-header";
import { HistoryList } from "@/components/domain/history-list";
import { LinkChips } from "@/components/domain/link-chips";
import { StatusBadge } from "@/components/domain/status-badge";
import { Alert } from "@/components/ui/alert";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { loadLinkOptions, linkedOptions } from "@/features/context/link-options.server";
import { JournalCard } from "@/features/journal/journal-card";
import { RiskForm } from "@/features/risks/risk-form";
import { RiskStatusActions } from "@/features/risks/risk-status-actions";
import { loadApi, requireMe, withQuery } from "@/lib/api/server";
import { blockingLevel, riskSeverity, riskStatus, riskType } from "@/lib/design-system/status";
import { formatDateTime } from "@/lib/format";

export const metadata: Metadata = { title: "Risco · Tech Lead Hub" };

export default function RiskPage({ params }: PageProps<"/risks/[id]">) {
  return (
    <Suspense fallback={<DetailSkeleton />}>
      <RiskView params={params} />
    </Suspense>
  );
}

async function RiskView({ params }: Pick<PageProps<"/risks/[id]">, "params">) {
  const { id } = await params;
  const [risk, me, journal] = await Promise.all([
    loadApi(`/risks/${id}`, riskDetailSchema),
    requireMe(),
    loadApi(withQuery("/journal", { riskId: id, pageSize: "20" }), paginatedSchema(journalEntrySchema)),
  ]);
  if (!risk.ok && risk.reason === "not_found") notFound();
  if (!risk.ok || !me.ok || !journal.ok) return <ApiUnavailable />;
  const r = risk.data;
  const options = await loadLinkOptions(linkedOptions(r.links));
  if (!options.ok) return <ApiUnavailable />;
  const timeZone = me.data.workspace.timezone;

  return (
    <>
      <PageHeader
        eyebrow={<Link href="/risks" className="hover:underline">Riscos</Link>}
        title={r.title}
        description={
          <span className="flex flex-wrap items-center gap-1.5">
            <StatusBadge meta={riskType[r.type]} size="sm" />
            <StatusBadge meta={riskStatus[r.status]} size="sm" />
            <StatusBadge meta={riskSeverity[r.severity]} size="sm" variant="outline" />
            {r.blockingLevel && <StatusBadge meta={blockingLevel[r.blockingLevel]} size="sm" variant="outline" />}
          </span>
        }
        actions={
          <>
            <RiskStatusActions risk={r} />
            <DeleteButton path={`/risks/${r.id}`} redirectTo="/risks" question="Excluir o risco definitivamente?" />
          </>
        }
      />

      {r.status === "RESOLVED" && (
        <Alert tone="success" title={`Resolvido${r.resolvedAt ? ` em ${formatDateTime(r.resolvedAt, timeZone)}` : ""}`}>
          {r.resolutionNote ?? "Sem descrição da resolução."} Entregas e atividades associadas não foram concluídas
          automaticamente (§16.4).
        </Alert>
      )}

      <div className="grid items-start gap-4 lg:grid-cols-[1fr_20rem]">
        <Card>
          <CardHeader>
            <CardTitle>Dados</CardTitle>
            <CardDescription>Alterações são auditadas e usam controle de versão.</CardDescription>
          </CardHeader>
          <CardContent>
            <RiskForm risk={r} options={options.data} />
          </CardContent>
        </Card>
        <div className="flex min-w-0 flex-col gap-4">
          <Card>
            <CardHeader>
              <CardTitle>Afeta</CardTitle>
            </CardHeader>
            <CardContent>
              <LinkChips links={r.links} empty="Nenhum contexto vinculado." />
            </CardContent>
          </Card>
          <JournalCard entries={journal.data.items} href={`/journal?riskId=${r.id}`} />
          <Card>
            <CardHeader>
              <CardTitle>Histórico</CardTitle>
            </CardHeader>
            <CardContent>
              <HistoryList entries={r.history} timeZone={timeZone} statusMap={riskStatus} />
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}
