import { todayIn } from "@tlh/shared-contracts";
import type { Prisma } from "../generated/prisma/client";
import { notFound, ruleViolation } from "./persistence";

/** Cliente Prisma ou de transação: as regras valem nos dois. */
type Db = Pick<Prisma.TransactionClient, "team" | "project" | "developer" | "workspace">;

/** Hoje no fuso do workspace (§35.3): datas de negócio nunca dependem do fuso do servidor. */
export async function workspaceToday(db: Db, workspaceId: string): Promise<string> {
  const workspace = await db.workspace.findUniqueOrThrow({ where: { id: workspaceId }, select: { timezone: true } });
  return todayIn(workspace.timezone);
}

/** Novos vínculos exigem time ativo (§7.4). Vínculos já existentes não passam por aqui. */
export async function assertTeamsActive(db: Db, workspaceId: string, ids: readonly string[], path: string): Promise<void> {
  if (ids.length === 0) return;
  const teams = await db.team.findMany({ where: { id: { in: [...ids] }, workspaceId } });
  if (teams.length !== new Set(ids).size) throw ruleViolation("Time não encontrado.", path);
  const inactive = teams.find((team) => team.status !== "ACTIVE");
  if (inactive) throw ruleViolation(`O time ${inactive.code} está inativo (§7.4).`, path);
}

/** Projetos arquivados não recebem novos planejamentos (§8.5). */
export async function assertProjectsOpen(db: Db, workspaceId: string, ids: readonly string[], path: string): Promise<void> {
  if (ids.length === 0) return;
  const projects = await db.project.findMany({ where: { id: { in: [...ids] }, workspaceId } });
  if (projects.length !== new Set(ids).size) throw ruleViolation("Projeto não encontrado.", path);
  const archived = projects.find((project) => project.status === "ARCHIVED");
  if (archived) throw ruleViolation(`O projeto ${archived.code} está arquivado (§8.5).`, path);
}

/** Desenvolvedores inativos não recebem novas entregas (§10.2). */
export async function assertDeveloperActive(db: Db, workspaceId: string, id: string, path: string): Promise<void> {
  const developer = await db.developer.findFirst({ where: { id, workspaceId } });
  if (!developer) throw notFound("Desenvolvedor");
  if (developer.status !== "ACTIVE") throw ruleViolation(`${developer.name} está inativo(a) (§10.2).`, path);
}
