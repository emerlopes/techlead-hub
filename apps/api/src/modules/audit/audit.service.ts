import { Injectable } from "@nestjs/common";
import type { HistoryEntry } from "@tlh/shared-contracts";
import type { Prisma } from "../../generated/prisma/client";
import { notFound } from "../../common/persistence";
import { PrismaService } from "../../infrastructure/prisma/prisma.service";

/** Entidades com exclusão definitiva; a trilha de auditoria guarda o evento após a remoção. */
export type DeletableEntity =
  | "team"
  | "project"
  | "developer"
  | "task"
  | "work_item"
  | "sprint"
  | "release"
  | "risk"
  | "journal_entry"
  | "execution_plan";

export type AuditAction =
  | `${DeletableEntity}.deleted`
  | "auth.setup"
  | "auth.login"
  | "auth.login_failed"
  | "auth.login_locked"
  | "auth.logout"
  | "workspace.updated"
  | "team.created"
  | "team.updated"
  | "project.created"
  | "project.updated"
  | "developer.created"
  | "developer.updated"
  | "team_project.created"
  | "team_project.ended"
  | "team_developer.created"
  | "team_developer.ended"
  | "task.created"
  | "task.updated"
  | "task.completed"
  | "focus_queue.updated"
  | "external_source.created"
  | "external_source.updated"
  | "work_item.created"
  | "work_item.updated"
  | "work_item.checked"
  | "work_item.estimated"
  | "refinement.updated"
  | "refinement_check_item.created"
  | "refinement_check_item.updated"
  | "refinement_check_item.deleted"
  | "sprint.created"
  | "sprint.updated"
  | "sprint.started"
  | "sprint.closed"
  | "sprint.item_added"
  | "sprint.item_removed"
  | "sprint.item_moved"
  | "release.created"
  | "release.updated"
  | "release.item_added"
  | "release.item_updated"
  | "release.item_removed"
  | "release_milestone.created"
  | "release_milestone.updated"
  | "release_milestone.deleted"
  | "risk.created"
  | "risk.updated"
  | "journal_entry.created"
  | "journal_entry.updated"
  | "work_schedule.created"
  | "work_schedule.updated"
  | "work_schedule.ended"
  | "availability_exception.created"
  | "availability_exception.updated"
  | "availability_exception.cancelled"
  | "capacity_allocation.created"
  | "capacity_allocation.updated"
  | "capacity_allocation.deleted"
  | "execution_plan.created"
  | "execution_plan.updated"
  | "execution_plan.queue_updated"
  | "work_dependency.created"
  | "work_dependency.updated"
  | "work_dependency.released"
  | "work_dependency.deleted";

export type AuditInput = {
  action: AuditAction;
  entityType:
    | "user"
    | "workspace"
    | "session"
    | "team"
    | "project"
    | "developer"
    | "team_project"
    | "team_developer"
    | "task"
    | "focus_queue"
    | "external_source"
    | "work_item"
    | "refinement_check_item"
    | "sprint"
    | "release"
    | "release_milestone"
    | "risk"
    | "journal_entry"
    | "work_schedule"
    | "availability_exception"
    | "capacity_allocation"
    | "execution_plan"
    | "work_dependency";
  entityId?: string;
  workspaceId?: string;
  actorUserId?: string;
  /** Somente dados não sensíveis: nunca senhas, tokens ou motivos pessoais (§44.5). */
  metadata?: Prisma.InputJsonValue;
};

type AuditClient = Pick<PrismaService, "auditEvent">;

type TransactionClient = Parameters<Parameters<PrismaService["$transaction"]>[0]>[0];

/** Registro somente-inserção de eventos relevantes (§34.18, RNF-004, RNF-022). */
@Injectable()
export class AuditService {
  constructor(private readonly prisma: PrismaService) {}

  /** Aceita o cliente de uma transação para que o evento e a mudança sejam atômicos. */
  async record(event: AuditInput, client: AuditClient = this.prisma): Promise<void> {
    await client.auditEvent.create({ data: event });
  }

  /**
   * Exclusão definitiva escopada ao workspace: `remove` deve filtrar por `workspaceId` e devolver a
   * contagem (0 → 404). Vínculos, históricos e filhos saem pelas FKs em cascata, na mesma transação
   * do evento de auditoria.
   */
  async deleteEntity(
    target: { entityType: DeletableEntity; entityId: string; workspaceId: string; actorUserId: string; label: string },
    remove: (tx: TransactionClient) => Promise<{ count: number }>,
  ): Promise<void> {
    const { label, ...event } = target;
    await this.prisma.$transaction(async (tx) => {
      const { count } = await remove(tx);
      if (count === 0) throw notFound(label);
      await this.record({ ...event, action: `${event.entityType}.deleted` }, tx);
    });
  }

  /**
   * Histórico de uma entidade a partir da trilha de auditoria (RNF-004): ação, campos alterados e
   * transição de situação, do mais recente para o mais antigo.
   */
  async history(workspaceId: string, entityType: AuditInput["entityType"], entityId: string): Promise<HistoryEntry[]> {
    const events = await this.prisma.auditEvent.findMany({
      where: { workspaceId, entityType, entityId },
      orderBy: { occurredAt: "desc" },
      take: 100,
    });
    return events.map((event) => {
      const meta = isRecord(event.metadata) ? event.metadata : {};
      return {
        id: event.id,
        action: event.action,
        occurredAt: event.occurredAt.toISOString(),
        fields: Array.isArray(meta.fields) ? meta.fields.filter((f): f is string => typeof f === "string") : [],
        fromStatus: typeof meta.fromStatus === "string" ? meta.fromStatus : null,
        toStatus: typeof meta.toStatus === "string" ? meta.toStatus : null,
      };
    });
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
