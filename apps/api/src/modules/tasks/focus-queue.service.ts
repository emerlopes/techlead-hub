import { Injectable } from "@nestjs/common";
import { type FocusQueue, isOpenTask, type UpdateFocusQueueInput } from "@tlh/shared-contracts";
import { ruleViolation } from "../../common/persistence";
import { PrismaService } from "../../infrastructure/prisma/prisma.service";
import { AuditService } from "../audit/audit.service";
import type { AuthContext } from "../identity/auth-context";
import { taskInclude, toTaskDto } from "./task.mapper";
import { TasksService } from "./tasks.service";

/**
 * Fila de foco (§6.6): até três atividades abertas (RN-003), no máximo um foco principal
 * (RN-002) e ordem manual. As constraints do banco garantem as mesmas regras.
 */
@Injectable()
export class FocusQueueService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly tasks: TasksService,
  ) {}

  async get(auth: AuthContext, today?: string): Promise<FocusQueue> {
    const [items, day] = await Promise.all([
      this.prisma.focusQueueItem.findMany({
        where: { workspaceId: auth.workspaceId },
        include: { task: { include: taskInclude } },
        orderBy: { position: "asc" },
      }),
      today ?? this.tasks.today(auth),
    ]);
    return {
      items: items.map((item) => ({
        position: item.position,
        isPrimary: item.isPrimary,
        task: toTaskDto(item.task, day),
      })),
    };
  }

  /** `PUT /focus-queue`: substitui a fila inteira de forma atômica. */
  async replace(auth: AuthContext, input: UpdateFocusQueueInput): Promise<FocusQueue> {
    const tasks = await this.prisma.task.findMany({
      where: { id: { in: input.taskIds }, workspaceId: auth.workspaceId },
      select: { id: true, status: true },
    });
    if (tasks.length !== input.taskIds.length) throw ruleViolation("Atividade não encontrada.", "taskIds");
    if (tasks.some((task) => !isOpenTask(task.status))) {
      throw ruleViolation("Atividades concluídas ou canceladas não entram na fila de foco (§6.6).", "taskIds");
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.focusQueueItem.deleteMany({ where: { workspaceId: auth.workspaceId } });
      await tx.focusQueueItem.createMany({
        data: input.taskIds.map((taskId, position) => ({
          workspaceId: auth.workspaceId,
          taskId,
          position,
          isPrimary: taskId === input.primaryTaskId,
        })),
      });
      await this.audit.record(
        {
          action: "focus_queue.updated",
          entityType: "focus_queue",
          workspaceId: auth.workspaceId,
          actorUserId: auth.userId,
          metadata: { taskIds: input.taskIds, primaryTaskId: input.primaryTaskId },
        },
        tx,
      );
    });
    return this.get(auth);
  }
}
