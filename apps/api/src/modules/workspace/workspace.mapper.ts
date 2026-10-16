import type { Workspace } from "@tlh/shared-contracts";
import type { Workspace as WorkspaceRow } from "../../generated/prisma/client";

export function toWorkspaceDto(row: WorkspaceRow): Workspace {
  return {
    id: row.id,
    name: row.name,
    timezone: row.timezone,
    locale: row.locale,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    version: row.version,
  };
}
