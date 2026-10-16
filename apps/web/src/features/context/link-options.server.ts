import "server-only";
import { projectSchema, releaseSchema, riskSchema, sprintSchema, taskSchema, teamSchema } from "@tlh/shared-contracts";
import { z } from "zod";
import type { CheckboxOption } from "@/components/ui/checkbox-group";
import { loadOpenWorkItems } from "@/lib/api/options";
import { loadApi, type Loaded } from "@/lib/api/server";
import type { LinkKind, LinkOptions } from "./link-options";

/**
 * Contextos em aberto para vincular. Os já vinculados entram por `extra`, para que editar não perca
 * vínculos com itens encerrados ou contextos arquivados.
 */
export async function loadLinkOptions(extra: Partial<Record<LinkKind, CheckboxOption[]>> = {}): Promise<Loaded<LinkOptions>> {
  const [workItems, sprints, releases, projects, teams, tasks, risks] = await Promise.all([
    loadOpenWorkItems(),
    loadApi("/sprints", z.array(sprintSchema)),
    loadApi("/releases", z.array(releaseSchema)),
    loadApi("/projects", z.array(projectSchema)),
    loadApi("/teams", z.array(teamSchema)),
    loadApi("/tasks", z.array(taskSchema)),
    loadApi("/risks", z.array(riskSchema)),
  ]);
  if (!workItems.ok || !sprints.ok || !releases.ok || !projects.ok || !teams.ok || !tasks.ok || !risks.ok) {
    return { ok: false, reason: "unavailable" };
  }
  const merge = (kind: LinkKind, base: CheckboxOption[]) => [
    ...(extra[kind] ?? []).filter((e) => !base.some((b) => b.id === e.id)),
    ...base,
  ];
  return {
    ok: true,
    data: {
      workItems: merge("workItems", workItems.data.items.map((w) => ({ id: w.id, code: w.externalKey, label: w.title }))),
      sprints: merge(
        "sprints",
        sprints.data.filter((s) => s.status === "PLANNED" || s.status === "ACTIVE").map((s) => ({ id: s.id, code: s.team.code, label: s.name })),
      ),
      releases: merge(
        "releases",
        releases.data
          .filter((r) => r.status === "PLANNED" || r.status === "IN_PROGRESS")
          .map((r) => ({ id: r.id, code: r.project.code, label: r.name })),
      ),
      projects: merge("projects", projects.data.filter((p) => p.status !== "ARCHIVED").map((p) => ({ id: p.id, code: p.code, label: p.name }))),
      teams: merge("teams", teams.data.filter((t) => t.status === "ACTIVE").map((t) => ({ id: t.id, code: t.code, label: t.name }))),
      tasks: merge("tasks", tasks.data.map((t) => ({ id: t.id, label: t.title }))),
      risks: merge("risks", risks.data.map((r) => ({ id: r.id, label: r.title }))),
    },
  };
}

/** Converte vínculos existentes em opções extras (código + rótulo). */
export function linkedOptions(links: {
  workItems?: { id: string; externalKey: string; title: string }[];
  sprints?: { id: string; name: string }[];
  releases?: { id: string; name: string }[];
  projects?: { id: string; code: string; name: string }[];
  teams?: { id: string; code: string; name: string }[];
  tasks?: { id: string; title: string }[];
  risks?: { id: string; title: string }[];
}): Partial<Record<LinkKind, CheckboxOption[]>> {
  return {
    workItems: links.workItems?.map((w) => ({ id: w.id, code: w.externalKey, label: w.title })),
    sprints: links.sprints?.map((s) => ({ id: s.id, label: s.name })),
    releases: links.releases?.map((r) => ({ id: r.id, label: r.name })),
    projects: links.projects?.map((p) => ({ id: p.id, code: p.code, label: p.name })),
    teams: links.teams?.map((t) => ({ id: t.id, code: t.code, label: t.name })),
    tasks: links.tasks?.map((t) => ({ id: t.id, label: t.title })),
    risks: links.risks?.map((r) => ({ id: r.id, label: r.title })),
  };
}
