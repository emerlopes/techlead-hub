import type { TeamDeveloper, TeamProject } from "@tlh/shared-contracts";
import type { Prisma } from "../../generated/prisma/client";
import { toIsoOrNull } from "../../common/persistence";

const contextSelect = { id: true, code: true, name: true, status: true } as const;

export const teamProjectInclude = {
  team: { select: contextSelect },
  project: { select: contextSelect },
} satisfies Prisma.TeamProjectInclude;

export const teamDeveloperInclude = {
  team: { select: contextSelect },
  developer: { select: { id: true, name: true, status: true } },
} satisfies Prisma.TeamDeveloperInclude;

/** Ativas primeiro, depois o histórico do mais recente para o mais antigo (RN-025). */
export const associationOrder = [
  { endedAt: { sort: "desc", nulls: "first" } },
  { startedAt: "desc" },
] satisfies Prisma.TeamProjectOrderByWithRelationInput[];

type TeamProjectRow = Prisma.TeamProjectGetPayload<{ include: typeof teamProjectInclude }>;
type TeamDeveloperRow = Prisma.TeamDeveloperGetPayload<{ include: typeof teamDeveloperInclude }>;

export function toTeamProjectDto(row: TeamProjectRow): TeamProject {
  return {
    id: row.id,
    team: row.team,
    project: row.project,
    isPrimary: row.isPrimary,
    startedAt: row.startedAt.toISOString(),
    endedAt: toIsoOrNull(row.endedAt),
  };
}

export function toTeamDeveloperDto(row: TeamDeveloperRow): TeamDeveloper {
  return {
    id: row.id,
    team: row.team,
    developer: row.developer,
    startedAt: row.startedAt.toISOString(),
    endedAt: toIsoOrNull(row.endedAt),
  };
}
