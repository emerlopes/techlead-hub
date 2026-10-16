import { externalSourceSchema } from "@tlh/shared-contracts";
import type { Metadata } from "next";
import { Suspense } from "react";
import { z } from "zod";
import { ApiUnavailable } from "@/components/app/api-unavailable";
import { PageHeader } from "@/components/app/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/misc";
import { SourceManager } from "@/features/work-items/source-manager";
import { WorkspaceForm } from "@/features/workspace/workspace-form";
import { loadApi, requireMe } from "@/lib/api/server";
import { listTimeZones } from "@/lib/time-zones";

export const metadata: Metadata = { title: "Configurações · Tech Lead Hub" };

export default function SettingsPage() {
  return (
    <>
      <PageHeader title="Configurações" description="Preferências e configurações globais do workspace." />
      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle>Workspace</CardTitle>
          <CardDescription>
            Alterações são auditadas. Se outra sessão salvar antes, você será avisado em vez de sobrescrever.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Suspense fallback={<FormSkeleton />}>
            <Settings />
          </Suspense>
        </CardContent>
      </Card>
      <Card id="sources" className="max-w-2xl scroll-mt-20">
        <CardHeader>
          <CardTitle>Origens de itens externos</CardTitle>
          <CardDescription>
            Ferramentas de onde vêm histórias e bugs (Jira, Azure DevOps…). O identificador do item é único por origem
            (RN-005); a URL é só referência (§13.6).
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Suspense fallback={<FormSkeleton />}>
            <Sources />
          </Suspense>
        </CardContent>
      </Card>
    </>
  );
}

async function Sources() {
  const result = await loadApi("/external-sources", z.array(externalSourceSchema));
  if (!result.ok) return <ApiUnavailable />;
  return <SourceManager sources={result.data} />;
}

async function Settings() {
  const result = await requireMe();
  if (!result.ok) return <ApiUnavailable />;
  const { workspace } = result.data;
  return <WorkspaceForm workspace={workspace} timeZones={listTimeZones(workspace.timezone)} />;
}

function FormSkeleton() {
  return (
    <div className="flex flex-col gap-4" aria-busy="true" aria-label="Carregando">
      {[0, 1].map((i) => (
        <div key={i} className="flex flex-col gap-1.5">
          <Skeleton className="h-3 w-20" />
          <Skeleton className="h-8 w-full" />
        </div>
      ))}
      <Skeleton className="ml-auto h-8 w-24" />
    </div>
  );
}
