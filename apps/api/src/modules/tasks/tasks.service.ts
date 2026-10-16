import { Injectable } from "@nestjs/common";
import {
  compareTasksDefault,
  type completeTaskSchema,
  type createTaskSchema,
  isOpenTask,
  type Task,
  type taskListQuerySchema,
  todayIn,
  type updateTaskSchema,
} from "@tlh/shared-contracts";
import type { z } from "zod";
import type { Prisma, TaskStatus } from "../../generated/prisma/client";
import { changedFields, fromIsoDate, notFound, ruleViolation, versionConflict } from "../../common/persistence";
import { PrismaService } from "../../infrastructure/prisma/prisma.service";
import { type AuditAction, AuditService } from "../audit/audit.service";
import type { AuthContext } from "../identity/auth-context";
import { taskInclude, toTaskDto } from "./task.mapper";

const ENTITY = "Atividade";
const CLOSED_STATUSES: TaskStatus[] = ["DONE", "CANCELLED"];

type Tx = Prisma.TransactionClient;
type UpdateInput = z.output<typeof updateTaskSchema>;

/** Atividades pessoais (§6, §34.6). Domínio separado das entregas (§3.2, DEC-005). */
@Injectable()
export class TasksService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  /** Hoje no fuso do workspace (§35.3). */
  async today(auth: AuthContext): Promise<string> {
    const workspace = await this.prisma.workspace.findUniqueOrThrow({
      where: { id: auth.workspaceId },
      select: { timezone: true },
    });
    return todayIn(workspace.timezone);
  }

  /** Filtro de contexto (§5.3): a atividade aparece uma única vez, mesmo com vários vínculos (§6.8). */
  contextWhere(auth: AuthContext, context: { teamId?: string; projectId?: string }): Prisma.TaskWhereInput {
    return {
      workspaceId: auth.workspaceId,
      ...(context.teamId && { teams: { some: { teamId: context.teamId } } }),
      ...(context.projectId && { projects: { some: { projectId: context.projectId } } }),
    };
  }

  async list(auth: AuthContext, query: z.output<typeof taskListQuerySchema>): Promise<Task[]> {
    const status =
      query.scope === "open" ? { notIn: CLOSED_STATUSES } : query.scope === "closed" ? { in: CLOSED_STATUSES } : undefined;
    const [rows, today] = await Promise.all([
      this.prisma.task.findMany({ where: { ...this.contextWhere(auth, query), status }, include: taskInclude }),
      this.today(auth),
    ]);
    const tasks = rows.map((row) => toTaskDto(row, today));
    const open = tasks.filter((t) => isOpenTask(t.status)).sort(compareTasksDefault);
    // Encerradas: das mais recentes para as mais antigas.
    const closed = tasks
      .filter((t) => !isOpenTask(t.status))
      .sort((a, b) => (b.completedAt ?? b.cancelledAt ?? b.updatedAt).localeCompare(a.completedAt ?? a.cancelledAt ?? a.updatedAt));
    return [...open, ...closed];
  }

  async get(auth: AuthContext, id: string): Promise<Task> {
    const [row, today] = await Promise.all([
      this.prisma.task.findFirst({ where: { id, workspaceId: auth.workspaceId }, include: taskInclude }),
      this.today(auth),
    ]);
    if (!row) throw notFound(ENTITY);
    return toTaskDto(row, today);
  }

  async create(auth: AuthContext, input: z.output<typeof createTaskSchema>): Promise<Task> {
    const { teamIds, projectIds, dueDate, ...fields } = input;
    await this.assertLinkable(auth, teamIds, projectIds);
    const id = await this.prisma.$transaction(async (tx) => {
      const task = await tx.task.create({
        data: {
          ...fields,
          dueDate: fromIsoDate(dueDate),
          workspaceId: auth.workspaceId,
          teams: { createMany: { data: teamIds.map((teamId) => ({ teamId })) } },
          projects: { createMany: { data: projectIds.map((projectId) => ({ projectId })) } },
        },
      });
      await this.audit.record(
        {
          action: "task.created",
          entityType: "task",
          entityId: task.id,
          workspaceId: auth.workspaceId,
          actorUserId: auth.userId,
          metadata: { teamIds, projectIds },
        },
        tx,
      );
      return task.id;
    });
    return this.get(auth, id);
  }

  update(auth: AuthContext, id: string, input: UpdateInput): Promise<Task> {
    return this.applyUpdate(auth, id, input, "task.updated");
  }

  /** `POST /tasks/{id}/complete` (§36.6). Não resolve histórias, riscos ou impedimentos ligados (§6.8). */
  complete(auth: AuthContext, id: string, input: z.output<typeof completeTaskSchema>): Promise<Task> {
    return this.applyUpdate(auth, id, { ...input, status: "DONE" }, "task.completed");
  }

  private async applyUpdate(auth: AuthContext, id: string, input: UpdateInput, action: AuditAction): Promise<Task> {
    const { version, teamIds, projectIds, dueDate, status, ...fields } = input;
    const current = await this.prisma.task.findFirst({
      where: { id, workspaceId: auth.workspaceId },
      include: { teams: { select: { teamId: true } }, projects: { select: { projectId: true } } },
    });
    if (!current) throw notFound(ENTITY);

    // Só vínculos novos passam pelas regras de time inativo / projeto arquivado.
    await this.assertLinkable(
      auth,
      (teamIds ?? []).filter((teamId) => !current.teams.some((link) => link.teamId === teamId)),
      (projectIds ?? []).filter((projectId) => !current.projects.some((link) => link.projectId === projectId)),
    );

    const data: Prisma.TaskUpdateManyMutationInput = {
      ...fields,
      dueDate: fromIsoDate(dueDate),
      version: { increment: 1 },
    };
    if (status && status !== current.status) {
      data.status = status;
      data.completedAt = status === "DONE" ? new Date() : null;
      data.cancelledAt = status === "CANCELLED" ? new Date() : null;
      // O motivo do bloqueio só faz sentido enquanto a atividade estiver bloqueada.
      if (status !== "BLOCKED" && fields.blockedReason === undefined) data.blockedReason = null;
    }

    await this.prisma.$transaction(async (tx) => {
      const result = await tx.task.updateMany({ where: { id, workspaceId: auth.workspaceId, version }, data });
      if (result.count === 0) throw versionConflict(ENTITY);
      await this.replaceLinks(tx, id, teamIds, projectIds);
      // Atividade concluída ou cancelada sai da fila de foco (§6.6).
      if (status && !isOpenTask(status)) await tx.focusQueueItem.deleteMany({ where: { taskId: id } });
      await this.audit.record(
        {
          action,
          entityType: "task",
          entityId: id,
          workspaceId: auth.workspaceId,
          actorUserId: auth.userId,
          metadata: {
            fields: changedFields({ ...input }),
            fromVersion: version,
            ...(status && status !== current.status && { fromStatus: current.status, toStatus: status }),
          },
        },
        tx,
      );
    });
    return this.get(auth, id);
  }

  private async replaceLinks(tx: Tx, taskId: string, teamIds?: string[], projectIds?: string[]): Promise<void> {
    if (teamIds) {
      await tx.taskTeam.deleteMany({ where: { taskId, teamId: { notIn: teamIds } } });
      await tx.taskTeam.createMany({ data: teamIds.map((teamId) => ({ taskId, teamId })), skipDuplicates: true });
    }
    if (projectIds) {
      await tx.taskProject.deleteMany({ where: { taskId, projectId: { notIn: projectIds } } });
      await tx.taskProject.createMany({
        data: projectIds.map((projectId) => ({ taskId, projectId })),
        skipDuplicates: true,
      });
    }
  }

  /** Atividades podem existir sem contexto (RN-023); novos vínculos exigem contexto ativo. */
  private async assertLinkable(auth: AuthContext, teamIds: string[], projectIds: string[]): Promise<void> {
    const [teams, projects] = await Promise.all([
      teamIds.length
        ? this.prisma.team.findMany({ where: { id: { in: teamIds }, workspaceId: auth.workspaceId } })
        : [],
      projectIds.length
        ? this.prisma.project.findMany({ where: { id: { in: projectIds }, workspaceId: auth.workspaceId } })
        : [],
    ]);
    if (teams.length !== teamIds.length) throw ruleViolation("Time não encontrado.", "teamIds");
    if (projects.length !== projectIds.length) throw ruleViolation("Projeto não encontrado.", "projectIds");
    const inactive = teams.find((team) => team.status !== "ACTIVE");
    if (inactive) throw ruleViolation(`O time ${inactive.code} está inativo (§7.4).`, "teamIds");
    const archived = projects.find((project) => project.status === "ARCHIVED");
    if (archived) throw ruleViolation(`O projeto ${archived.code} está arquivado (§8.5).`, "projectIds");
  }
}
