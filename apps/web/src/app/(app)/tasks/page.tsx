import { focusQueueSchema, type TaskListQuery, taskListQuerySchema, taskSchema, todayIn } from "@tlh/shared-contracts";
import { ListTodo, Plus, Target } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { z } from "zod";
import { ApiUnavailable } from "@/components/app/api-unavailable";
import { ListSkeleton } from "@/components/app/page-skeletons";
import { PageHeader } from "@/components/app/page-header";
import { DomainTag } from "@/components/domain/domain-tag";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { ContextBar, ContextBarSkeleton } from "@/features/context/context-bar";
import { readContext } from "@/features/context/context.server";
import { FocusQueueEditor } from "@/features/tasks/focus-queue-editor";
import { TaskViews } from "@/features/tasks/task-views";
import { loadApi, requireMe, withQuery } from "@/lib/api/server";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Minhas atividades · Tech Lead Hub" };

const scopes = [
  { value: "open", label: "Abertas" },
  { value: "closed", label: "Encerradas" },
  { value: "all", label: "Todas" },
] as const;

export default function TasksPage({ searchParams }: PageProps<"/tasks">) {
  return (
    <>
      <PageHeader
        title="Minhas atividades"
        description="O que você precisa fazer — separado das entregas dos times (§3.2)."
        actions={
          <Link href="/tasks/new" className={buttonVariants()}>
            <Plus aria-hidden />
            Nova atividade
          </Link>
        }
      />
      <Suspense fallback={<ContextBarSkeleton />}>
        <ContextSection />
      </Suspense>
      <Suspense fallback={<ListSkeleton rows={2} />}>
        <FocusSection />
      </Suspense>
      <Suspense fallback={<ListSkeleton />}>
        <TaskSection searchParams={searchParams} />
      </Suspense>
    </>
  );
}

async function ContextSection() {
  return <ContextBar selected={await readContext()} />;
}

async function FocusSection() {
  const queue = await loadApi("/focus-queue", focusQueueSchema);
  if (!queue.ok) return <ApiUnavailable />;
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-1.5">
          <Target className="size-4 text-personal" aria-hidden />
          Fila de foco
        </CardTitle>
        <CardDescription>
          Até três atividades, uma delas como foco principal (RN-002, RN-003). Não muda com o contexto.
        </CardDescription>
        <CardAction>
          <DomainTag domain="personal" />
        </CardAction>
      </CardHeader>
      <CardContent>
        {queue.data.items.length === 0 ? (
          <p className="text-xs text-muted-foreground">
            Nenhuma atividade em foco. Abra uma atividade e use “Colocar em foco”.
          </p>
        ) : (
          <FocusQueueEditor queue={queue.data} />
        )}
      </CardContent>
    </Card>
  );
}

async function TaskSection({ searchParams }: Pick<PageProps<"/tasks">, "searchParams">) {
  const raw = await searchParams;
  const parsed = taskListQuerySchema.safeParse({ scope: raw.scope });
  const scope = parsed.success ? parsed.data.scope : "open";
  const context = await readContext();
  const query: TaskListQuery = { scope, ...context };
  const [tasks, me] = await Promise.all([
    loadApi(withQuery("/tasks", query), z.array(taskSchema)),
    requireMe(),
  ]);
  if (!tasks.ok || !me.ok) return <ApiUnavailable />;

  return (
    <section className="flex flex-col gap-3" aria-label="Atividades">
      <nav aria-label="Situação" className="inline-flex h-8 w-fit items-center gap-0.5 rounded-md bg-secondary p-0.5">
        {scopes.map(({ value, label }) => (
          <Link
            key={value}
            href={value === "open" ? "/tasks" : `/tasks?scope=${value}`}
            aria-current={scope === value ? "page" : undefined}
            className={cn(
              "pressable inline-flex h-7 items-center rounded-[calc(var(--radius)-4px)] px-2.5 text-xs font-medium text-muted-foreground hover:text-foreground",
              scope === value && "bg-surface text-foreground shadow-xs",
            )}
          >
            {label}
          </Link>
        ))}
      </nav>
      {tasks.data.length === 0 ? (
        <EmptyState
          icon={ListTodo}
          title={scope === "closed" ? "Nenhuma atividade encerrada" : "Nenhuma atividade por aqui"}
          description={
            context.teamId || context.projectId
              ? "Nada encontrado no contexto selecionado. Limpe o filtro para ver todas."
              : "Registre o que você precisa fazer: revisões, decisões, acompanhamentos, reuniões."
          }
          action={
            <Link href="/tasks/new" className={buttonVariants({ variant: "outline" })}>
              <Plus aria-hidden />
              Nova atividade
            </Link>
          }
        />
      ) : (
        <TaskViews tasks={tasks.data} today={todayIn(me.data.workspace.timezone)} />
      )}
    </section>
  );
}
