import { type Dashboard, dashboardSchema, type Task } from "@tlh/shared-contracts";
import {
  CalendarClock,
  ClockAlert,
  FolderKanban,
  ListTodo,
  OctagonX,
  Plus,
  Target,
  UserRound,
  Users,
} from "lucide-react";
import Link from "next/link";
import { Suspense } from "react";
import { ApiUnavailable } from "@/components/app/api-unavailable";
import { PageHeader } from "@/components/app/page-header";
import { ContextChip, DomainTag } from "@/components/domain/domain-tag";
import { FocusCard } from "@/components/domain/focus-card";
import { Kpi } from "@/components/domain/kpi";
import { TaskItem } from "@/components/domain/task-item";
import { Alert } from "@/components/ui/alert";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/misc";
import { ContextBar, ContextBarSkeleton } from "@/features/context/context-bar";
import { readContext } from "@/features/context/context.server";
import { loadApi, requireMe, withQuery } from "@/lib/api/server";
import { formatBusinessDate, formatBusinessDateLong } from "@/lib/format";

export default function HomePage() {
  return (
    <Suspense fallback={<HomeSkeleton />}>
      <Home />
    </Suspense>
  );
}

async function Home() {
  const context = await readContext();
  const [me, dashboard] = await Promise.all([requireMe(), loadApi(withQuery("/dashboard", context), dashboardSchema)]);
  if (!me.ok) return <ApiUnavailable />;
  const firstName = me.data.user.name.split(" ")[0];

  return (
    <>
      <PageHeader
        eyebrow={me.data.workspace.name}
        title={`Olá, ${firstName}`}
        description={dashboard.ok ? <span className="first-letter:uppercase">{formatBusinessDateLong(dashboard.data.today)}</span> : undefined}
        actions={
          <Link href="/tasks/new" className={buttonVariants()}>
            <Plus aria-hidden />
            Nova atividade
          </Link>
        }
      />
      <Suspense fallback={<ContextBarSkeleton />}>
        <ContextBar selected={context} />
      </Suspense>
      {dashboard.ok ? (
        <DashboardView data={dashboard.data} />
      ) : dashboard.reason === "not_found" ? (
        <Alert tone="warning" title="Contexto não encontrado">
          O time ou projeto selecionado não existe mais. Limpe o filtro de contexto.
        </Alert>
      ) : (
        <ApiUnavailable />
      )}
    </>
  );
}

function DashboardView({ data }: { data: Dashboard }) {
  const { personal, focus, organization, context } = data;
  const primary = focus.items.find((item) => item.isPrimary);
  const others = focus.items.filter((item) => !item.isPrimary);
  const contextual = context.team || context.project;

  return (
    <>
      {contextual && (
        <p className="-mt-2 flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
          Visão contextual:
          {context.team && <ContextChip code={context.team.code} name={context.team.name} />}
          {context.project && <ContextChip code={context.project.code} name={context.project.name} />}
          — a fila de foco não muda com o contexto (§5.4).
        </p>
      )}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi label="Atrasadas" value={personal.overdue.length} icon={ClockAlert} tone={personal.overdue.length ? "danger" : "neutral"} />
        <Kpi label="Vencem hoje" value={personal.dueToday.length} icon={CalendarClock} tone={personal.dueToday.length ? "attention" : "neutral"} />
        <Kpi label="Bloqueadas" value={personal.blocked.length} icon={OctagonX} tone={personal.blocked.length ? "blocked" : "neutral"} />
        <Kpi
          label="Abertas"
          value={personal.openCount}
          icon={ListTodo}
          tone="personal"
          hint={`${personal.inProgressCount} em andamento`}
        />
      </div>

      <div className="grid items-start gap-4 lg:grid-cols-2">
        <div className="flex flex-col gap-4">
          {primary ? (
            <FocusCard
              title={primary.task.title}
              href={`/tasks/${primary.task.id}`}
              priority={primary.task.priority}
              status={primary.task.status}
              due={primary.task.dueDate ? formatBusinessDate(primary.task.dueDate) : undefined}
              overdue={primary.task.dueState === "OVERDUE"}
              nextAction={primary.task.nextAction ?? undefined}
              contexts={[...primary.task.teams, ...primary.task.projects].map((c) => c.code)}
            />
          ) : (
            <EmptyState
              icon={Target}
              title="Sem foco principal"
              description="Escolha até três atividades para a fila de foco e marque uma como principal (RN-002)."
              action={
                <Link href="/tasks" className={buttonVariants({ variant: "outline" })}>
                  Organizar foco
                </Link>
              }
            />
          )}
          {others.length > 0 && (
            <TaskCard title="Também em foco" description="Ordem manual da fila de foco (§6.6)." tasks={others.map((i) => i.task)} />
          )}
          <TaskCard
            title="Bloqueadas"
            description="Pedem remoção de impedimento, não replanejamento."
            tasks={personal.blocked}
            empty="Nenhuma atividade bloqueada."
          />
        </div>

        <div className="flex flex-col gap-4">
          <TaskCard title="Atrasadas" description="Concluídas nunca aparecem aqui (RN-001)." tasks={personal.overdue} empty="Nada atrasado." />
          <TaskCard title="Para hoje" tasks={personal.dueToday} empty="Nada vence hoje." />
          <TaskCard title="Próximos vencimentos" description="Nos próximos 7 dias." tasks={personal.upcoming} empty="Nenhum vencimento próximo." />
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Organização</CardTitle>
          <CardDescription>Cadastros ativos no workspace.</CardDescription>
          <CardAction>
            <DomainTag domain="delivery" />
          </CardAction>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-3">
          <OrgLink href="/teams" icon={Users} label="Times ativos" value={organization.activeTeams} />
          <OrgLink href="/projects" icon={FolderKanban} label="Projetos ativos" value={organization.activeProjects} />
          <OrgLink href="/developers" icon={UserRound} label="Pessoas ativas" value={organization.activeDevelopers} />
        </CardContent>
      </Card>
      <p className="text-xs text-muted-foreground">
        Entregas críticas, sprints, releases, capacidade e recomendações entram no dashboard nas próximas etapas.
      </p>
    </>
  );
}

function TaskCard({
  title,
  description,
  tasks,
  empty,
}: {
  title: string;
  description?: string;
  tasks: Task[];
  empty?: string;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {title}
          <span className="font-mono text-xs font-normal text-muted-foreground tabular">{tasks.length}</span>
        </CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
        <CardAction>
          <DomainTag domain="personal" />
        </CardAction>
      </CardHeader>
      <CardContent>
        {tasks.length === 0 ? (
          <p className="text-xs text-muted-foreground">{empty}</p>
        ) : (
          <ul className="flex flex-col divide-y divide-border">
            {tasks.map((task) => (
              <li key={task.id} className="py-2.5 first:pt-0 last:pb-0">
                <TaskItem task={task} showNextAction />
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

function OrgLink({ href, icon: Icon, label, value }: { href: string; icon: typeof Users; label: string; value: number }) {
  return (
    <Link
      href={href}
      className="pressable flex items-center gap-3 rounded-md border border-border px-3 py-2.5 hover:bg-surface-sunken"
    >
      <span className="flex size-8 items-center justify-center rounded-md bg-delivery-subtle text-delivery-fg">
        <Icon className="size-4" aria-hidden />
      </span>
      <span className="flex flex-col">
        <span className="text-lg leading-none font-semibold tabular">{value}</span>
        <span className="text-xs text-muted-foreground">{label}</span>
      </span>
    </Link>
  );
}

function HomeSkeleton() {
  return (
    <div className="flex flex-col gap-6" aria-busy="true" aria-label="Carregando">
      <div className="flex flex-col gap-2">
        <Skeleton className="h-3 w-24" />
        <Skeleton className="h-6 w-48" />
      </div>
      <Skeleton className="h-11" />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-24" />
        ))}
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <Skeleton className="h-48" />
        <Skeleton className="h-48" />
      </div>
    </div>
  );
}
