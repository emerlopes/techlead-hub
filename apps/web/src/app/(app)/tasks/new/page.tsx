import { projectSchema, teamSchema } from "@tlh/shared-contracts";
import type { Metadata } from "next";
import { Suspense } from "react";
import { z } from "zod";
import { ApiUnavailable } from "@/components/app/api-unavailable";
import { ListSkeleton } from "@/components/app/page-skeletons";
import { PageHeader } from "@/components/app/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { TaskForm } from "@/features/tasks/task-form";
import { loadApi } from "@/lib/api/server";

export const metadata: Metadata = { title: "Nova atividade · Tech Lead Hub" };

export default function NewTaskPage() {
  return (
    <>
      <PageHeader eyebrow="Minhas atividades" title="Nova atividade" description="Vínculos com times e projetos são opcionais (RN-023)." />
      <Card className="max-w-3xl">
        <CardContent className="pt-4">
          <Suspense fallback={<ListSkeleton rows={5} />}>
            <NewTask />
          </Suspense>
        </CardContent>
      </Card>
    </>
  );
}

async function NewTask() {
  const [teams, projects] = await Promise.all([
    loadApi("/teams?status=ACTIVE", z.array(teamSchema)),
    loadApi("/projects", z.array(projectSchema)),
  ]);
  if (!teams.ok || !projects.ok) return <ApiUnavailable />;
  return <TaskForm teams={teams.data} projects={projects.data.filter((p) => p.status !== "ARCHIVED")} />;
}
