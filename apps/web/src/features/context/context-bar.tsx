import { projectSchema, teamSchema } from "@tlh/shared-contracts";
import { z } from "zod";
import { Skeleton } from "@/components/ui/misc";
import { loadApi } from "@/lib/api/server";
import { ContextFilter } from "./context-filter";
import type { SelectedContext } from "./context-cookie";

/** Carrega as opções do filtro de contexto (times e projetos não arquivados). */
export async function ContextBar({ selected }: { selected: SelectedContext }) {
  const [teams, projects] = await Promise.all([
    loadApi("/teams", z.array(teamSchema)),
    loadApi("/projects", z.array(projectSchema)),
  ]);
  if (!teams.ok || !projects.ok) return null;
  return (
    <ContextFilter
      teams={teams.data.filter((t) => t.status === "ACTIVE" || t.id === selected.teamId)}
      projects={projects.data.filter((p) => p.status !== "ARCHIVED" || p.id === selected.projectId)}
      selected={selected}
    />
  );
}

export function ContextBarSkeleton() {
  return <Skeleton className="h-11 w-full" />;
}
