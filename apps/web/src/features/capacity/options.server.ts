import "server-only";
import { developerSchema, projectSchema, teamSchema } from "@tlh/shared-contracts";
import { z } from "zod";
import { loadApi, type Loaded } from "@/lib/api/server";
import type { CapacityOptions } from "./options";

/** Pessoas ativas, times ativos e projetos não arquivados — os destinos válidos de novos cadastros. */
export async function loadCapacityOptions(): Promise<Loaded<CapacityOptions>> {
  const [developers, teams, projects] = await Promise.all([
    loadApi("/developers?status=ACTIVE", z.array(developerSchema)),
    loadApi("/teams?status=ACTIVE", z.array(teamSchema)),
    loadApi("/projects", z.array(projectSchema)),
  ]);
  if (!developers.ok || !teams.ok || !projects.ok) return { ok: false, reason: "unavailable" };
  return {
    ok: true,
    data: {
      developers: developers.data.map((d) => ({ id: d.id, label: d.name })),
      teams: teams.data.map((t) => ({ id: t.id, label: `${t.code} · ${t.name}` })),
      projects: projects.data.filter((p) => p.status !== "ARCHIVED").map((p) => ({ id: p.id, label: `${p.code} · ${p.name}` })),
    },
  };
}
