import { CalendarClock, Globe, LayoutDashboard } from "lucide-react";
import { Suspense } from "react";
import { ApiUnavailable } from "@/components/app/api-unavailable";
import { PageHeader } from "@/components/app/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/misc";
import { requireMe } from "@/lib/api/server";
import { formatDateTime } from "@/lib/format";

export default function HomePage() {
  return (
    <Suspense fallback={<HomeSkeleton />}>
      <Home />
    </Suspense>
  );
}

async function Home() {
  const result = await requireMe();
  if (!result.ok) return <ApiUnavailable />;
  const { user, workspace, session } = result.data;
  const firstName = user.name.split(" ")[0];

  return (
    <>
      <PageHeader eyebrow={workspace.name} title={`Olá, ${firstName}`} description="Visão geral do seu workspace." />

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Workspace</CardTitle>
            <CardDescription>Contexto de operação e preferências globais.</CardDescription>
          </CardHeader>
          <CardContent>
            <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
              <dt className="text-muted-foreground">Nome</dt>
              <dd className="min-w-0 truncate font-medium">{workspace.name}</dd>
              <dt className="flex items-center gap-1.5 text-muted-foreground">
                <Globe className="size-3.5" aria-hidden />
                Fuso
              </dt>
              <dd className="font-mono text-xs leading-5">{workspace.timezone}</dd>
              <dt className="text-muted-foreground">Criado em</dt>
              <dd className="tabular">{formatDateTime(workspace.createdAt, workspace.timezone)}</dd>
            </dl>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Sessão</CardTitle>
            <CardDescription>Acesso do proprietário ({user.email}).</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="flex items-center gap-2 text-sm">
              <CalendarClock className="size-4 text-muted-foreground" aria-hidden />
              Expira em
              <span className="tabular font-medium">{formatDateTime(session.expiresAt, workspace.timezone)}</span>
            </p>
          </CardContent>
        </Card>
      </div>

      <EmptyState
        icon={LayoutDashboard}
        title="O dashboard ainda não tem dados"
        description="Times, projetos, desenvolvedores e suas atividades chegam na próxima etapa. Quando houver cadastros, a visão consolidada aparece aqui."
      />
    </>
  );
}

function HomeSkeleton() {
  return (
    <div className="flex flex-col gap-6" aria-busy="true" aria-label="Carregando">
      <div className="flex flex-col gap-2">
        <Skeleton className="h-3 w-24" />
        <Skeleton className="h-6 w-48" />
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <Skeleton className="h-36" />
        <Skeleton className="h-36" />
      </div>
      <Skeleton className="h-40" />
    </div>
  );
}
